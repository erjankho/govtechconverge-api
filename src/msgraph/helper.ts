import type {
  MSGraphDriveItem,
  MSGraphDriveItemFile,
  MSGraphDriveItemFileDeleted,
  MSGraphDriveItemFolder,
} from './types.js';

/**
 * Returns `true` if the given drive item is a file, else `false`.
 * @param driveItem - The drive item to check.
 */
export function isDriveItemFile(
  driveItem: MSGraphDriveItem,
): driveItem is MSGraphDriveItemFile | MSGraphDriveItemFileDeleted {
  return 'file' in driveItem;
}

/**
 * Returns `true` if the given drive item is deleted, else `false`.
 * @param driveItemFile - The drive item to check.
 */
export function isDriveItemFileDeleted(
  driveItemFile: MSGraphDriveItemFile | MSGraphDriveItemFileDeleted,
): driveItemFile is MSGraphDriveItemFileDeleted {
  return 'deleted' in driveItemFile;
}

/**
 * Returns `true` if the given drive item is a folder, else `false`.
 * @param driveItem - The drive item to check.
 */
export function isDriveItemFolder(
  driveItem: MSGraphDriveItem,
): driveItem is MSGraphDriveItemFolder {
  return 'folder' in driveItem;
}
