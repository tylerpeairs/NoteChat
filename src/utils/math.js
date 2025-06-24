

/**
 * Normalize a vector to unit length.
 * @param {number[]} vector 
 * @returns {number[]}
 */
export function normalize(vector) {
  const length = Math.hypot(...vector);
  if (length === 0) return vector.map(() => 0);
  return vector.map(v => v / length);
}

/**
 * Compute the dot product of two vectors.
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number}
 */
export function dot(a, b) {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i];
  }
  return result;
}

/**
 * Compute the cosine similarity between two vectors.
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  const magA = Math.hypot(...a);
  const magB = Math.hypot(...b);
  if (magA === 0 || magB === 0) return 0;
  return dot(a, b) / (magA * magB);
}

/**
 * Compute the cosine distance (1 - similarity) between two vectors.
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number}
 */
export function cosineDistance(a, b) {
  return 1 - cosineSimilarity(a, b);
}