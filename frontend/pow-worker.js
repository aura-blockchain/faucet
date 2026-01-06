/**
 * Web Worker for Proof of Work computation
 */

self.onmessage = function(e) {
  const { challenge, difficulty } = e.data;
  const target = '0'.repeat(difficulty);
  let nonce = 0;
  const maxIterations = 10000000;

  function sha256Simple(str) {
    // Simplified hash for demonstration
    // In production, use a proper crypto library
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(difficulty + 10, '0');
  }

  while (nonce < maxIterations) {
    const attempt = challenge + nonce.toString();
    const hash = sha256Simple(attempt);

    if (hash.startsWith(target)) {
      self.postMessage({
        type: 'solution',
        solution: nonce
      });
      return;
    }

    nonce++;

    // Report progress every 100k iterations
    if (nonce % 100000 === 0) {
      self.postMessage({
        type: 'progress',
        progress: (nonce / maxIterations) * 100
      });
    }
  }

  self.postMessage({
    type: 'error',
    error: 'Max iterations reached'
  });
};
