import { Command } from 'commander';

import dbDropAction from './cmd/db-drop.js';
import dbMigrateAction from './cmd/db-migrate.js';
import dbPlanAction from './cmd/db-plan.js';
import dbRollbackAction from './cmd/db-rollback.js';
import serverAction from './cmd/server.js';
import syncOneDriveAction from './cmd/sync-onedrive.js';

const program = new Command('converge')
  .description('CLI for Converge')
  .helpOption('-h, --help', 'Display help for command')
  .helpCommand(false)
  .configureOutput({ outputError: (str, write) => write(str.replace(/^error:/, 'Error:')) })
  .showHelpAfterError();

program
  .command('db:drop')
  .description('Drop all tables')
  .allowExcessArguments(false)
  .action(dbDropAction);

program
  .command('db:migrate')
  .description('Run database migration')
  .allowExcessArguments(false)
  .action(dbMigrateAction);

program
  .command('db:plan')
  .description('Create a new migration plan')
  .argument('<name>', 'Name of the migration')
  .allowExcessArguments(false)
  .action(dbPlanAction);

program
  .command('db:rollback')
  .description('Rollback the last applied migration')
  .allowExcessArguments(false)
  .action(dbRollbackAction);

program
  .command('server')
  .description('Start the API server')
  .allowExcessArguments(false)
  .action(serverAction);

program
  .command('sync:onedrive')
  .description('Sync files from OneDrive')
  .allowExcessArguments(false)
  .action(syncOneDriveAction);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
