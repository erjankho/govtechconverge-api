/**
 * A class for splitting text into smaller chunks while preserving semantic coherence.
 * Supports recursive splitting using different separators based on the text length.
 */
class RecursiveCharacterTextSplitter {
  #chunkSize = 1000;
  #chunkOverlap = 200;
  #separators = ['\n\n', '\n', ' ', ''];

  constructor(options?: Partial<{ chunkSize: number; chunkOverlap: number }>) {
    this.#chunkSize = options?.chunkSize ?? this.#chunkSize;
    this.#chunkOverlap = options?.chunkOverlap ?? this.#chunkOverlap;
  }

  /**
   * Splits a given text into smaller chunks.
   * @param text - The text to be split into chunks.
   */
  split(text: string) {
    return this.#split(text, 0);
  }

  #split(text: string, separatorIndex: number): string[] {
    const separator = this.#separators[separatorIndex];
    const result: string[] = [];

    let chunks: string[] = [];
    for (const s of text.split(separator).map((s) => s.trim())) {
      if (s.length < this.#chunkSize) {
        chunks.push(s);
        continue;
      }

      if (chunks.length > 0) {
        result.push(...this.#mergeChunks(chunks, separator));
        chunks = [];
      }

      result.push(...this.#split(s, separatorIndex + 1));
    }

    if (chunks.length > 0) {
      result.push(...this.#mergeChunks(chunks, separator));
    }

    return result;
  }

  #mergeChunks(chunks: string[], separator: string): string[] {
    const result: string[] = [];

    const tmp: {
      array: string[];
      length: number;
    } = {
      array: [],
      length: 0,
    };

    for (const chunk of chunks) {
      if (tmp.length + chunk.length + tmp.array.length * separator.length <= this.#chunkSize) {
        tmp.array.push(chunk);
        tmp.length += chunk.length;
        continue;
      }

      if (tmp.length > 0) {
        result.push(tmp.array.join(separator));

        while (
          tmp.length > this.#chunkOverlap ||
          tmp.length + chunk.length + tmp.array.length * separator.length > this.#chunkSize
        ) {
          tmp.length -= tmp.array[0].length;
          tmp.array.shift();
        }
      }

      tmp.array.push(chunk);
      tmp.length += chunk.length;
    }

    if (tmp.length > 0) {
      result.push(tmp.array.join(separator));
    }

    return result;
  }
}

export default RecursiveCharacterTextSplitter;
