import type { AccessToken } from '@azure/identity';
import { ClientSecretCredential } from '@azure/identity';
import type { Options } from 'ky';
import ky from 'ky';

import type {
  MSGraphBaseCollectionResponse,
  MSGraphDriveCollectionResponse,
  MSGraphDriveItemCollectionResponse,
  MSGraphErrorResponse,
  MSGraphExtractSensitivityLabelsResponse,
  MSGraphMessageCollectionResponse,
} from './types.js';

const BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface MSGraphClientOptions {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

interface RequestHeaders {
  Prefer: string;
}

class MSGraphClient {
  #credential: ClientSecretCredential;

  #accessToken: AccessToken | null = null;

  constructor({ tenantId, clientId, clientSecret }: MSGraphClientOptions) {
    this.#credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  /**
   * Sends an HTTP request to the specified endpoint and parses the response.
   * @param endpoint - The endpoint to send the request to.
   * @param [method] - The HTTP method.
   * @param [headers] - The additional request headers to attach.
   * @throws {MSGraphAPIError} if response is not OK.
   */
  async #api<T>({
    endpoint,
    method = 'GET',
    headers,
  }: {
    endpoint: string;
    method?: 'GET' | 'POST';
    headers?: RequestHeaders;
  }) {
    const options: Options = {
      method,
      headers: {
        Authorization: `Bearer ${await this.#getAccessToken()}`,
        ...headers,
      },
    };

    if (!endpoint.startsWith(BASE_URL)) {
      options.prefixUrl = BASE_URL;
    }

    const resp = await ky(endpoint, options);

    if (!resp.ok) {
      const data = await resp.json<MSGraphErrorResponse>();
      throw new MSGraphAPIError(data.error.message, data.error.code, resp.status);
    }

    return await resp.json<T>();
  }

  /**
   * Returns a valid access token.
   */
  async #getAccessToken() {
    if (!this.#accessToken || Date.now() - 60_000 >= this.#accessToken.expiresOnTimestamp) {
      this.#accessToken = await this.#credential.getToken(['https://graph.microsoft.com/.default']);
    }
    return this.#accessToken.token;
  }

  /**
   * Returns a paginated data from a collection endpoint, yielding each page of the collection.
   * @param endpoint - The endpoint to send the request to.
   * @param [headers] - The additional request headers to attach.
   */
  async *#getPaginatedCollection<T extends MSGraphBaseCollectionResponse>(
    endpoint: string,
    headers?: RequestHeaders,
  ) {
    let collection = await this.#api<T>({ endpoint, headers });

    while (collection) {
      yield collection;

      if (!collection['@odata.nextLink']) {
        break;
      }

      collection = await this.#api<T>({ endpoint: collection['@odata.nextLink'] });
    }
  }

  /**
   * Formats a given `Date` object into a `YYYY-MM-DD` string.
   *
   * @param {Date} date - The date to be formatted.
   * @returns {string} The formatted date string in `YYYY-MM-DD` format.
   */
  #formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Returns all drives associated with the specified email.
   * @param email - The email of the user.
   */
  async *getDriveCollectionByEmail(email: string) {
    yield* this.#getPaginatedCollection<MSGraphDriveCollectionResponse>(
      `users/${email}/drives?$select=id,name`,
    );
  }

  /**
   * Returns all drive items accosicated with the drive.
   * @param driveId - The unique identifier of the drive.
   */
  async *getDriveItemsByDriveId(driveId: string) {
    yield* this.#getPaginatedCollection<MSGraphDriveItemCollectionResponse>(
      `drives/${driveId}/root/delta?$select=id,name,file,folder,content.downloadUrl,size,deleted`,
    );
  }

  /**
   * Returns all drive items
   * @param deltaLink - The delta link of the drive.
   */
  async *getDriveDeltaByDeltaLink(deltaLink: string) {
    yield* this.#getPaginatedCollection<MSGraphDriveItemCollectionResponse>(deltaLink);
  }

  /**
   * Returns the sensitivity label of a drive item, or `null` if the drive item has no
   * sensitivity label or multiple sensitivity labels.
   * @param driveId - The unique identifier of the drive.
   * @param driveItemId - The unique identifier of the drive item.
   */
  async getDriveItemSensitivityLabel(driveId: string, driveItemId: string) {
    const result = await this.#api<MSGraphExtractSensitivityLabelsResponse>({
      endpoint: `drives/${driveId}/items/${driveItemId}/extractSensitivityLabels`,
      method: 'POST',
    });

    if (result.labels.length !== 1) {
      return null;
    }
    return result.labels[0].sensitivityLabelId;
  }

  /**
   * Returns all messages associated with the specific email, keyword, date to search from and date to search to.
   * @param email - The email of the user.
   * @param keyword - The keyword to search for.
   * @param dateFrom - The date to search from.
   * @param dateTo - The date to search till.
   */
  async *getMessagesByEmail(email: string, keyword: string, dateFrom: Date, dateTo: Date) {
    yield* this.#getPaginatedCollection<MSGraphMessageCollectionResponse>(
      `users/${email}/messages?
        $filter=(
          contains(subject, '${keyword}') or 
          contains(body/content, '${keyword}') or 
          contains(from/emailAddress/name, '${keyword}')
        ) and 
        receivedDateTime ge ${this.#formatDate(dateFrom)} and 
        receivedDateTime le ${this.#formatDate(dateTo)} 
        &$select=id,subject,body,from,receivedDateTime,internetMessageHeaders`,
      { Prefer: 'outlook.body-content-type="text"' },
    );
  }
}

export default MSGraphClient;

class MSGraphAPIError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'MSGraphAPIError';
    this.code = code;
    this.status = status;
  }
}
