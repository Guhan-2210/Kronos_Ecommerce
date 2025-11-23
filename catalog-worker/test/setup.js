// test/setup.js - Test configuration and setup
import { webcrypto } from 'crypto';

// Polyfill Web Crypto API for Node.js environment
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Polyfill TextEncoder/TextDecoder if needed
if (!globalThis.TextEncoder) {
  const util = await import('util');
  globalThis.TextEncoder = util.TextEncoder;
  globalThis.TextDecoder = util.TextDecoder;
}

// Polyfill btoa/atob for Node.js
if (!globalThis.btoa) {
  globalThis.btoa = str => Buffer.from(str, 'binary').toString('base64');
}

if (!globalThis.atob) {
  globalThis.atob = str => Buffer.from(str, 'base64').toString('binary');
}
