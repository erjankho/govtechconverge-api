import type {
  ColumnMetadata,
  ColumnType,
  Generated,
  GeneratedAlways,
  Insertable,
  Selectable,
  TableMetadata,
  Updateable,
} from 'kysely';

export type Metadata = Record<
  TableMetadata['name'],
  Record<ColumnMetadata['name'], ColumnMetadata>
>;

export interface Database {
  schema_migrations: SchemaMigrationTable;
  embeddings: EmbeddingTable;
  new_users: NewUserTable;
  files: FileTable;
  files_new_users: FileNewUserTable;
  messages: MessageTable;
  conversations: ConversationTable;
  email_embeddings: EmailEmbeddingTable;
  msgraph_delta_links: MSGraphDeltaLinkTable;
}

export interface SchemaMigrationTable {
  version: string;
}

type ForeignKey<T> = ColumnType<T, T, never>;

interface BaseTable {
  created_at: ColumnType<Date, Date | undefined, never>;
  updated_at: ColumnType<Date, Date | undefined, never>;
}

export interface EmbeddingTable extends BaseTable {
  id: GeneratedAlways<string>;
  file_id: ForeignKey<string>;
  embedding: ColumnType<number[], string, string>;
  text: string;
}
export type Embedding = Selectable<EmbeddingTable>;
export type EmbeddingNew = Insertable<EmbeddingTable>;
export type EmbeddingUpdate = Updateable<EmbeddingTable>;

export interface NewUserTable extends BaseTable {
  id: GeneratedAlways<string>;
  email: string;
  is_onedrive_sync_enabled: Generated<boolean>;
}
export type NewUser = Selectable<NewUserTable>;
export type NewUserNew = Insertable<NewUserTable>;
export type NewUserUpdate = Updateable<NewUserTable>;

export type FileAPIMetadata = null;
export interface FileMicrosoftMetadata {
  drive_item_id: string;
}
export interface FileTable extends BaseTable {
  id: GeneratedAlways<string>;
  name: string;
  size: number;
  mime_type: string;
  source: 'API' | 'MICROSOFT';
  metadata: FileAPIMetadata | FileMicrosoftMetadata;
}
export type File = Selectable<FileTable>;
export type FileNew = Insertable<FileTable>;
export type FileUpdate = Updateable<FileTable>;

export interface FileNewUserTable {
  file_id: ForeignKey<string>;
  new_user_id: ForeignKey<string>;
}
export type FileNewUser = Selectable<FileNewUserTable>;
export type FileNewUserNew = Insertable<FileNewUserTable>;

export type UserMessageMetadata = null;
export interface Tool {
  id: string;
  name: string;
  args: string;
}
export interface AssistantMessageMetadata {
  tools: Tool[];
}
export interface ToolMessageMetadata {
  tool_id: string;
}
export interface MessageTable extends BaseTable {
  id: GeneratedAlways<string>;
  conversation_id: ForeignKey<string>;
  content: string;
  author: 'USER' | 'ASSISTANT' | 'TOOL';
  order: number;
  metadata: UserMessageMetadata | AssistantMessageMetadata | ToolMessageMetadata;
}
export type Message = Selectable<MessageTable>;
export type MessageNew = Insertable<MessageTable>;
export type MessageUpdate = Updateable<MessageTable>;

export interface ConversationTable extends BaseTable {
  id: GeneratedAlways<string>;
  new_user_id: ForeignKey<string>;
  title: string;
}
export type Conversation = Selectable<ConversationTable>;
export type ConversationNew = Insertable<ConversationTable>;
export type ConversationUpdate = Updateable<ConversationTable>;

interface EmailMetadata {
  id: string;
  subject: string;
  received_at: Date;
}
export interface EmailEmbeddingTable extends BaseTable {
  id: GeneratedAlways<string>;
  conversation_id: ForeignKey<string>;
  embedding: ColumnType<number[], string, never>;
  text: string;
  expires_on: ColumnType<Date, Date, never>;
  metadata: ColumnType<EmailMetadata, EmailMetadata, never>;
}
export type EmailEmbedding = Selectable<EmailEmbeddingTable>;
export type EmailEmbeddingNew = Insertable<EmailEmbeddingTable>;

export interface MSGraphDeltaLinkTable extends BaseTable {
  id: GeneratedAlways<string>;
  entity_id: string;
  entity_type: 'DRIVE';
  link: string;
}
export type MSGraphDeltaLink = Selectable<MSGraphDeltaLinkTable>;
export type MSGraphDeltaLinkNew = Insertable<MSGraphDeltaLinkTable>;
export type MSGraphDeltaLinkUpdate = Updateable<MSGraphDeltaLinkTable>;
