import type {
  AnalyzeResultOperationOutput,
  DocumentIntelligenceClient,
} from '@azure-rest/ai-document-intelligence';
import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';

class AzureDocumentIntelligenceLoader {
  #client: DocumentIntelligenceClient;

  constructor(options: { apiKey: string; endpoint: string }) {
    this.#client = DocumentIntelligence(options.endpoint, { key: options.apiKey });
  }

  async load(url: string) {
    const initialResponse = await this.#client
      .path('/documentModels/{modelId}:analyze', 'prebuilt-read')
      .post({
        contentType: 'application/json',
        body: { urlSource: url },
        queryParameters: { outputContentFormat: 'markdown' },
      });

    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error;
    }

    const poller = await getLongRunningPoller(this.#client, initialResponse);
    const result = ((await poller.pollUntilDone()).body as AnalyzeResultOperationOutput)
      .analyzeResult!;

    return result.content;
  }
}

export default AzureDocumentIntelligenceLoader;
