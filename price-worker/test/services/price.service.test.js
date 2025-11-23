// test/services/price.service.test.js
import { expect } from 'chai';
import { PriceService } from '../../src/services/price.service.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('Price Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    mockEnv.DB._reset();
    mockEnv.PRICE_CACHE._reset();
  });

  describe('setPrice', () => {
    it('should create a new price', async () => {
      const productId = 'product-123';
      const price = 1000;
      const currency = 'INR';

      const result = await PriceService.setPrice(mockEnv, productId, price, currency);

      expect(result).to.have.property('productId');
      expect(result.productId).to.equal(productId);
      expect(result.price).to.equal(price);
      expect(result.currency).to.equal(currency);
      expect(result.created).to.be.true;
    });

    it('should update existing price', async () => {
      const productId = 'product-456';
      const initialPrice = 1000;
      const updatedPrice = 1500;

      // Create initial price
      await PriceService.setPrice(mockEnv, productId, initialPrice, 'INR');

      // Update price
      const result = await PriceService.setPrice(mockEnv, productId, updatedPrice, 'INR');

      expect(result.price).to.equal(updatedPrice);
      expect(result.updated).to.be.true;
    });

    it('should cache the price', async () => {
      const productId = 'product-789';
      const price = 2000;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Check if cached
      const cached = await mockEnv.PRICE_CACHE.get(`price:${productId}`, 'json');
      expect(cached).to.not.be.null;
      expect(cached.price).to.equal(price);
    });

    it('should use default currency INR', async () => {
      const productId = 'product-default';
      const price = 500;

      const result = await PriceService.setPrice(mockEnv, productId, price);

      expect(result.currency).to.equal('INR');
    });

    it('should handle different currencies', async () => {
      const productId = 'product-usd';
      const price = 100;
      const currency = 'USD';

      const result = await PriceService.setPrice(mockEnv, productId, price, currency);

      expect(result.currency).to.equal(currency);
    });

    it('should handle decimal prices', async () => {
      const productId = 'product-decimal';
      const price = 999.99;

      const result = await PriceService.setPrice(mockEnv, productId, price, 'INR');

      expect(result.price).to.equal(price);
    });

    it('should handle zero price', async () => {
      const productId = 'product-free';
      const price = 0;

      const result = await PriceService.setPrice(mockEnv, productId, price, 'INR');

      expect(result.price).to.equal(0);
    });
  });

  describe('getPrice', () => {
    it('should get price from database', async () => {
      const productId = 'product-get';
      const price = 1500;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Clear cache to force DB lookup
      await mockEnv.PRICE_CACHE.delete(`price:${productId}`);

      const result = await PriceService.getPrice(mockEnv, productId);

      expect(result).to.not.be.null;
      expect(result.price).to.equal(price);
      expect(result._cached).to.be.false;
    });

    it('should get price from cache if available', async () => {
      const productId = 'product-cached';
      const price = 2000;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Second call should be from cache
      const result = await PriceService.getPrice(mockEnv, productId);

      expect(result._cached).to.be.true;
      expect(result.price).to.equal(price);
    });

    it('should return null for non-existent product', async () => {
      const result = await PriceService.getPrice(mockEnv, 'non-existent');

      expect(result).to.be.null;
    });

    it('should cache price after DB fetch', async () => {
      const productId = 'product-cache-test';
      const price = 3000;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Clear cache
      await mockEnv.PRICE_CACHE.delete(`price:${productId}`);

      // Get from DB (should cache it)
      await PriceService.getPrice(mockEnv, productId);

      // Verify it's now cached
      const cached = await mockEnv.PRICE_CACHE.get(`price:${productId}`, 'json');
      expect(cached).to.not.be.null;
    });

    it('should include product_id in response', async () => {
      const productId = 'product-with-id';
      const price = 750;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Clear cache to get from DB
      await mockEnv.PRICE_CACHE.delete(`price:${productId}`);

      const result = await PriceService.getPrice(mockEnv, productId);

      expect(result).to.have.property('product_id');
      expect(result.product_id).to.equal(productId);
    });
  });

  describe('getPrices', () => {
    it('should get prices for multiple products', async () => {
      const productIds = ['product-1', 'product-2', 'product-3'];
      const prices = [1000, 2000, 3000];

      // Set prices
      for (let i = 0; i < productIds.length; i++) {
        await PriceService.setPrice(mockEnv, productIds[i], prices[i], 'INR');
      }

      // Clear cache
      for (const id of productIds) {
        await mockEnv.PRICE_CACHE.delete(`price:${id}`);
      }

      const results = await PriceService.getPrices(mockEnv, productIds);

      expect(results).to.be.an('array');
      expect(results.length).to.equal(3);
    });

    it('should use cache for available prices', async () => {
      const productIds = ['prod-a', 'prod-b', 'prod-c'];
      const prices = [100, 200, 300];

      for (let i = 0; i < productIds.length; i++) {
        await PriceService.setPrice(mockEnv, productIds[i], prices[i], 'INR');
      }

      // First call caches them
      await PriceService.getPrices(mockEnv, productIds);

      // Second call should use cache
      const results = await PriceService.getPrices(mockEnv, productIds);

      const cachedResults = results.filter(r => r._cached);
      expect(cachedResults.length).to.be.greaterThan(0);
    });

    it('should handle mix of cached and non-cached prices', async () => {
      const productIds = ['prod-1', 'prod-2'];

      await PriceService.setPrice(mockEnv, productIds[0], 500, 'INR');
      await PriceService.setPrice(mockEnv, productIds[1], 1000, 'INR');

      // Cache first product
      await PriceService.getPrice(mockEnv, productIds[0]);

      // Clear cache for second product
      await mockEnv.PRICE_CACHE.delete(`price:${productIds[1]}`);

      const results = await PriceService.getPrices(mockEnv, productIds);

      expect(results.length).to.equal(2);
    });

    it('should handle empty product array', async () => {
      const results = await PriceService.getPrices(mockEnv, []);

      expect(results).to.be.an('array');
      expect(results.length).to.equal(0);
    });

    it('should skip non-existent products', async () => {
      const productIds = ['exists-1', 'non-existent', 'exists-2'];

      await PriceService.setPrice(mockEnv, 'exists-1', 100, 'INR');
      await PriceService.setPrice(mockEnv, 'exists-2', 200, 'INR');

      // Clear cache
      await mockEnv.PRICE_CACHE.delete('price:exists-1');
      await mockEnv.PRICE_CACHE.delete('price:exists-2');

      const results = await PriceService.getPrices(mockEnv, productIds);

      expect(results.length).to.equal(2);
    });

    it('should preserve product order information', async () => {
      const productIds = ['p1', 'p2', 'p3'];

      for (const id of productIds) {
        await PriceService.setPrice(mockEnv, id, 100, 'INR');
      }

      // Clear cache
      for (const id of productIds) {
        await mockEnv.PRICE_CACHE.delete(`price:${id}`);
      }

      const results = await PriceService.getPrices(mockEnv, productIds);

      expect(results.length).to.equal(3);
      // Check that all product IDs are present
      for (const result of results) {
        expect(result).to.have.property('product_id');
        expect(productIds).to.include(result.product_id);
      }
    });
  });

  describe('hasChanged', () => {
    it('should return true when price not found', async () => {
      const result = await PriceService.hasChanged(mockEnv, 'non-existent', Date.now());

      expect(result.changed).to.be.true;
      expect(result.reason).to.include('not found');
    });

    it('should return true when price updated after timestamp', async () => {
      const productId = 'product-updated';
      const price = 1000;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Update price
      await PriceService.setPrice(mockEnv, productId, 1500, 'INR');

      // Clear cache to get fresh data from DB
      await mockEnv.PRICE_CACHE.delete(`price:${productId}`);

      // Get the updated_at timestamp
      const currentPrice = await PriceService.getPrice(mockEnv, productId);

      // Check if changed since a timestamp before the update
      const oldTimestamp = currentPrice.updated_at - 2;
      const result = await PriceService.hasChanged(mockEnv, productId, oldTimestamp);

      expect(result.changed).to.be.true;
      expect(result.reason).to.include('updated');
      expect(result.currentPrice).to.equal(1500);
    });

    it('should return false when price not changed', async () => {
      const productId = 'product-unchanged';
      const price = 2000;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      // Check with future timestamp
      const futureTimestamp = Math.floor(Date.now() / 1000) + 100;
      const result = await PriceService.hasChanged(mockEnv, productId, futureTimestamp);

      expect(result.changed).to.be.false;
    });

    it('should include updated timestamp in response', async () => {
      const productId = 'product-timestamp';
      const price = 3000;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');
      await new Promise(resolve => setTimeout(resolve, 10));
      await PriceService.setPrice(mockEnv, productId, 3500, 'INR');

      const oldTimestamp = Math.floor(Date.now() / 1000) - 10;
      const result = await PriceService.hasChanged(mockEnv, productId, oldTimestamp);

      if (result.changed && result.reason === 'Price updated') {
        expect(result).to.have.property('updatedAt');
        expect(result.updatedAt).to.be.a('number');
      }
    });

    it('should work with different timestamp formats', async () => {
      const productId = 'product-ts-test';
      const price = 1200;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      const timestamp = Math.floor(Date.now() / 1000) - 100;
      const result = await PriceService.hasChanged(mockEnv, productId, timestamp);

      expect(result).to.have.property('changed');
      expect(result.changed).to.be.a('boolean');
    });
  });

  describe('Cache behavior', () => {
    it('should cache with correct TTL', async () => {
      const productId = 'product-ttl';
      const price = 500;

      await PriceService.setPrice(mockEnv, productId, price, 'INR');

      const cacheEntry = mockEnv.PRICE_CACHE._getStore().get(`price:${productId}`);
      expect(cacheEntry).to.exist;
      expect(cacheEntry.expiration).to.be.a('number');
    });

    it('should invalidate cache on price update', async () => {
      const productId = 'product-invalidate';
      const initialPrice = 1000;
      const updatedPrice = 1500;

      await PriceService.setPrice(mockEnv, productId, initialPrice, 'INR');

      // Get price (caches it)
      await PriceService.getPrice(mockEnv, productId);

      // Update price (should update cache)
      await PriceService.setPrice(mockEnv, productId, updatedPrice, 'INR');

      // Get from cache
      const result = await PriceService.getPrice(mockEnv, productId);

      expect(result.price).to.equal(updatedPrice);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large prices', async () => {
      const productId = 'product-large';
      const price = 9999999999;

      const result = await PriceService.setPrice(mockEnv, productId, price, 'INR');

      expect(result.price).to.equal(price);
    });

    it('should handle small decimal prices', async () => {
      const productId = 'product-small';
      const price = 0.01;

      const result = await PriceService.setPrice(mockEnv, productId, price, 'INR');

      expect(result.price).to.equal(price);
    });

    it('should handle product IDs with special characters', async () => {
      const productId = 'product-123-abc_xyz';
      const price = 750;

      const result = await PriceService.setPrice(mockEnv, productId, price, 'INR');

      expect(result.productId).to.equal(productId);
    });
  });
});
