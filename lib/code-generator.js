'use strict';

const crypto = require('crypto');

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateShortCode(length = 7) {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError('length must be a positive integer');
  }

  const bytes = crypto.randomBytes(length);
  let code = '';

  for (let index = 0; index < length; index += 1) {
    code += ALPHABET[bytes[index] % ALPHABET.length];
  }

  return code;
}

async function reserveUniqueShortCode(store, longUrl, { maxAttempts = 100 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateShortCode();
    const reserved = await store.reserve(code, longUrl);
    if (reserved) {
      return code;
    }
  }

  throw new Error('Unable to reserve a unique short code');
}

module.exports = {
  generateShortCode,
  reserveUniqueShortCode,
};
