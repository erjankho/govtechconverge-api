import OpenAI from '../ai/llm/openai.js';
import AzureDocumentIntelligenceLoader from '../ai/loader/azure-document-intelligence-loader.js';
import RecursiveCharacterTextSplitter from '../ai/text-splitter/recursive-character-text-splitter.js';
import type { SyncConfig } from '../config/sync-config.js';
import { loadSyncConfig } from '../config/sync-config.js';
import type { EmbeddingNew } from '../db/index.js';
import { createDatabase, sql } from '../db/index.js';
import type { Logger } from '../internal/logger.js';
import { createLogger } from '../internal/logger.js';
import MSGraphClient from '../msgraph/client.js';
import { isDriveItemFile, isDriveItemFileDeleted } from '../msgraph/helper.js';

export default async function syncOneDriveAction() {
  const config = loadSyncConfig();
  const logger = createLogger({ env: config.NODE_ENV });

  try {
    await runAction(config, logger);
  } catch (err) {
    logger.error(err);
  }
}

async function runAction(config: SyncConfig, logger: Logger) {
  logger.info(`Environment: ${config.NODE_ENV.toUpperCase()}`);

  const db = await createDatabase({ connectionString: config.POSTGRES_DSN });

  const users = await db
    .selectFrom('new_users')
    .select(['id', 'email'])
    .where('is_onedrive_sync_enabled', '=', true)
    .execute();

  if (users.length === 0) {
    logger.info('No users have enabled OneDrive sync.');
    await db.destroy();
    return;
  }

  const msgraph = new MSGraphClient({
    tenantId: config.MSGRAPH_API_TENANT_ID,
    clientId: config.MSGRAPH_API_CLIENT_ID,
    clientSecret: config.MSGRAPH_API_CLIENT_SECRET,
  });

  const loader = new AzureDocumentIntelligenceLoader({
    apiKey: config.AZURE_DOCUMENT_INTELLIGENCE_API_KEY,
    endpoint: config.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
  });

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

  const llm = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    baseURL: config.OPENAI_API_BASE_URL,
  });

  try {
    for (const user of users) {
      for await (const collection of msgraph.getDriveCollectionByEmail(user.email)) {
        for (const drive of collection.value) {
          // Skip drives that don't have the name `OneDrive`.
          if (drive.name !== 'OneDrive') {
            continue;
          }

          const delta = await db
            .selectFrom('msgraph_delta_links')
            .select(['id', 'link'])
            .where('entity_id', '=', drive.id)
            .where('entity_type', '=', 'DRIVE')
            .executeTakeFirst();

          const generator = delta
            ? msgraph.getDriveDeltaByDeltaLink(delta.link)
            : msgraph.getDriveItemsByDriveId(drive.id);

          for await (const collection of generator) {
            for (const driveItem of collection.value) {
              // Skip items that don't have a file facet.
              if (!isDriveItemFile(driveItem)) {
                continue;
              }

              if (isDriveItemFileDeleted(driveItem)) {
                logger.info(
                  {
                    drive: {
                      id: drive.id,
                      name: drive.name,
                    },
                    driveItem: {
                      id: driveItem.id,
                      name: driveItem.name,
                    },
                  },
                  'Removing indexed drive item...',
                );

                await db.transaction().execute(async (txn) => {
                  await txn
                    .with('deleted_files', (db) =>
                      db
                        .deleteFrom('files')
                        .where(sql`metadata->>'drive_item_id'`, '=', driveItem.id)
                        .returning('id'),
                    )
                    .deleteFrom('files_new_users')
                    .where('file_id', 'in', (eb) => eb.selectFrom('deleted_files').select('id'))
                    .execute();
                });
                continue;
              }

              // Skip items with an unsupported MIME type.
              if (!isMIMETypeSupported(driveItem.file.mimeType)) {
                logger.info(
                  {
                    drive: {
                      id: drive.id,
                      name: drive.name,
                    },
                    driveItem: {
                      id: driveItem.id,
                      name: driveItem.name,
                      mimeType: driveItem.file.mimeType,
                    },
                  },
                  'Skipped - Unsupported MIME type.',
                );
                continue;
              }

              const sensitivityLabel = await msgraph.getDriveItemSensitivityLabel(
                drive.id,
                driveItem.id,
              );

              // Skip items with an unsupported sensitivity label.
              // NOTE: Items without sensitivity label will be indexed.
              if (sensitivityLabel && !isSensitivityLabelSupported(sensitivityLabel)) {
                logger.info(
                  {
                    drive: {
                      id: drive.id,
                      name: drive.name,
                    },
                    driveItem: {
                      id: driveItem.id,
                      name: driveItem.name,
                      sensitivityLabel,
                    },
                  },
                  'Skipped - Unsupported sensitivity label.',
                );
                continue;
              }

              logger.info(
                {
                  drive: {
                    id: drive.id,
                    name: drive.name,
                  },
                  driveItem: {
                    id: driveItem.id,
                    name: driveItem.name,
                  },
                },
                'Indexing drive item...',
              );

              const content = await loader.load(driveItem['@microsoft.graph.downloadUrl']);

              await db.transaction().execute(async (txn) => {
                const file = await txn
                  .insertInto('files')
                  .values({
                    name: driveItem.name,
                    size: driveItem.size,
                    mime_type: driveItem.file!.mimeType,
                    source: 'MICROSOFT',
                    metadata: {
                      drive_item_id: driveItem.id,
                    },
                  })
                  .onConflict((oc) =>
                    oc.expression(sql`(metadata->>'drive_item_id')`).doUpdateSet((eb) => ({
                      name: eb.ref('excluded.name'),
                      size: eb.ref('excluded.size'),
                      mime_type: eb.ref('excluded.mime_type'),
                    })),
                  )
                  .returning('id')
                  .executeTakeFirstOrThrow();

                // Link the file to the current user.
                await txn
                  .insertInto('files_new_users')
                  .values({
                    file_id: file.id,
                    new_user_id: user.id,
                  })
                  .onConflict((oc) => oc.doNothing())
                  .execute();

                // Return early if the content is empty.
                if (!content) {
                  return;
                }

                // Delete all existing embeddings.
                await txn.deleteFrom('embeddings').where('file_id', '=', file.id).execute();

                // Split the content into chunks.
                const chunks = splitter.split(content);

                // Save new embeddings into database.
                await txn
                  .insertInto('embeddings')
                  .values(
                    await Promise.all(
                      chunks.map<Promise<EmbeddingNew>>(async (chunk) => ({
                        file_id: file.id,
                        embedding: JSON.stringify(
                          await llm.embedding.invoke(chunk, config.OPENAI_EMBEDDING_MODEL),
                        ),
                        text: chunk,
                      })),
                    ),
                  )
                  .execute();
              });

              logger.info(
                {
                  drive: {
                    id: drive.id,
                    name: drive.name,
                  },
                  driveItem: {
                    id: driveItem.id,
                    name: driveItem.name,
                  },
                },
                'Indexed drive item!',
              );
            }

            // Continue iterating through the drive items.
            // Stop only when the `deltaLink` is included in the collection response,
            // as it is present only on the last page of the response.
            if (!collection['@odata.deltaLink']) {
              continue;
            }

            await db
              .insertInto('msgraph_delta_links')
              .values({
                entity_id: drive.id,
                entity_type: 'DRIVE',
                link: collection['@odata.deltaLink'],
              })
              .onConflict((oc) =>
                oc.constraint('entity_id_entity_type_unique').doUpdateSet((eb) => ({
                  link: eb.ref('excluded.link'),
                })),
              )
              .execute();
          }
        }
      }
    }
  } finally {
    await db.destroy();
  }

  logger.info('Done!');
}

const SUPPORTED_MIME_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
};

function isMIMETypeSupported(mimeType: string) {
  return mimeType in SUPPORTED_MIME_TYPES;
}

const SUPPORTED_SENSITIVITY_LABELS = {
  '5434c4c7-833e-41e4-b0ab-cdb227a2f6f7': 'OFFICIAL (OPEN)',
  '4aaa7e78-45b1-4890-b8a3-003d1d728a3e': 'OFFICIAL (CLOSED) / NON-SENSITIVE',
  '770f46e1-5fba-47ae-991f-a0785d9c0dac': 'OFFICIAL (CLOSED) / SENSITIVE NORMAL',
  'a8737adb-0c79-46a2-8440-0996bc024fec': 'OFFICIAL (CLOSED) / SENSITIVE HIGH',
  '54803508-8490-4252-b331-d9b72689e942': 'RESTRICTED / NON-SENSITIVE',
  '153db910-0838-4c35-bb3a-1ee21aa199ac': 'RESTRICTED / SENSITIVE NORMAL',
};

function isSensitivityLabelSupported(labelId: string) {
  return labelId in SUPPORTED_SENSITIVITY_LABELS;
}
