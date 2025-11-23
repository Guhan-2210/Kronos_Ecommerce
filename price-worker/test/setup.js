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
