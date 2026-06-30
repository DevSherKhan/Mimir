export function serializeVector(vector: number[]): string {
  return JSON.stringify(vector);
}

export function parseVector(input: string): number[] {
  const value = JSON.parse(input) as unknown;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "number")) {
    throw new Error("Invalid vector payload in database.");
  }

  return value;
}

export function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 1;
  }

  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
