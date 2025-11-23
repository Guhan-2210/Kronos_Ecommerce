// test/setup.js
import { webcrypto } from 'crypto';

// Make Web Crypto API available
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Polyfill for btoa/atob (base64 encoding/decoding)
if (!globalThis.btoa) {
  globalThis.btoa = str => Buffer.from(str, 'binary').toString('base64');
}

if (!globalThis.atob) {
  globalThis.atob = str => Buffer.from(str, 'base64').toString('binary');
}
