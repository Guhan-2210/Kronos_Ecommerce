/**
 * Test setup and configuration for fulfilment-worker unit tests
 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

// Configure chai
chai.use(chaiAsPromised);
chai.config.includeStack = true;
chai.config.showDiff = true;
chai.config.truncateThreshold = 0;

// Set test timeout
const DEFAULT_TIMEOUT = 5000;
export { DEFAULT_TIMEOUT };
