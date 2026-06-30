export interface TextChunk {
  index: number;
  content: string;
}

export function chunkText(text: string, targetWords = 450, overlapWords = 60): TextChunk[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  if (words.length <= targetWords) {
    return [{ index: 0, content: words.join(" ") }];
  }

  const chunks: TextChunk[] = [];
  const step = Math.max(1, targetWords - overlapWords);

  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + targetWords);
    if (slice.length === 0) {
      break;
    }

    chunks.push({
      index: chunks.length,
      content: slice.join(" "),
    });

    if (start + targetWords >= words.length) {
      break;
    }
  }

  return chunks;
}
