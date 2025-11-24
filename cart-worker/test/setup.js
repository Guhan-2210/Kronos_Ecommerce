// test/setup.js
import { webcrypto } from 'crypto';
import chai from 'chai';
import sinonChai from 'sinon-chai';

// Setup crypto
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// Setup sinon-chai for better assertions
chai.use(sinonChai);
