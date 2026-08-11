/**
 * Buffer streaming text and emit it in TTS-friendly chunks.
 *
 * We split on Japanese sentence terminators (。 ！ ？) and a few ASCII fallbacks
 * so the avatar can start speaking before Claude finishes generating.
 */

const TERMINATORS = /[。！？!?]/;

export class SentenceBuffer {
  private buffer = "";

  /**
   * Append a delta. Returns any complete sentences ready to be spoken.
   * The trailing partial sentence stays buffered until `flush()`.
   */
  push(delta: string): string[] {
    this.buffer += delta;
    const out: string[] = [];
    while (true) {
      const match = this.buffer.match(TERMINATORS);
      if (!match || match.index === undefined) break;
      const cut = match.index + 1;
      const sentence = this.buffer.slice(0, cut).trim();
      this.buffer = this.buffer.slice(cut);
      if (sentence) out.push(sentence);
    }
    return out;
  }

  /** Drain whatever is left in the buffer (called when the stream ends). */
  flush(): string | null {
    const tail = this.buffer.trim();
    this.buffer = "";
    return tail.length > 0 ? tail : null;
  }
}
