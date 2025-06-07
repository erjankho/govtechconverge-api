/**
 * Represents an error response from MSGraph API.
 */
export interface MSGraphErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Represents a MSGraph entity.
 */
interface MSGraphEntity {
  readonly id: string;
}

/**
 * Represents a MSGraph drive.
 */
export interface MSGraphDrive extends MSGraphEntity {
  readonly name: string;
}

interface MSGraphBaseDriveItem extends MSGraphEntity {
  readonly name: string;
  readonly size: number;
}

interface MSGraphDriveItemFileBase extends MSGraphBaseDriveItem {
  readonly file: { readonly mimeType: string };
}

/**
 * Represents a MSGraph drive item with file metadata.
 */
export interface MSGraphDriveItemFile extends MSGraphDriveItemFileBase {
  readonly '@microsoft.graph.downloadUrl': string;
}

/**
 * Represents a deleted MSGraph drive item with file metadata.
 */
export interface MSGraphDriveItemFileDeleted extends MSGraphDriveItemFileBase {
  readonly deleted: { state: 'deleted' };
}

/**
 * Represents a MSGraph drive item with folder metadata.
 */
export interface MSGraphDriveItemFolder extends MSGraphBaseDriveItem {
  readonly folder: { readonly childCount: number };
}

export type MSGraphDriveItem =
  | MSGraphDriveItemFile
  | MSGraphDriveItemFileDeleted
  | MSGraphDriveItemFolder;

/**
 * Represents the base collection response from MSGraph API.
 */
export interface MSGraphBaseCollectionResponse<T extends MSGraphEntity = MSGraphEntity> {
  readonly value: T[];
  readonly '@odata.nextLink'?: string;
  readonly '@odata.deltaLink'?: string;
}
export type MSGraphDriveCollectionResponse = MSGraphBaseCollectionResponse<MSGraphDrive>;
export type MSGraphDriveItemCollectionResponse = MSGraphBaseCollectionResponse<MSGraphDriveItem>;

/**
 * Represents a response from MSGraph API with sensitivity labels.
 */
export interface MSGraphExtractSensitivityLabelsResponse {
  readonly labels: { readonly sensitivityLabelId: string }[];
}

/**
 * Represents a MSGraph message with metadata.
 */
export interface MSGraphMessage extends MSGraphEntity {
  readonly id: string;
  readonly subject: string;
  readonly body: {
    content: string;
    contentType: 'text' | 'html';
  };
  readonly sender: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  readonly receivedDateTime: Date;
  readonly internetMessageHeaders: {
    name: string;
    value: string;
  }[];
}
export type MSGraphMessageCollectionResponse = MSGraphBaseCollectionResponse<MSGraphMessage>;
