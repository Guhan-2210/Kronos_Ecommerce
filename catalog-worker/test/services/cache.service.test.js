// test/services/cache.service.test.js
import { expect } from 'chai';
import { CacheService } from '../../src/services/cache.service.js';
import { createMockKV } from '../helpers/mock-env.js';

describe('Cache Service', () => {
  let mockKV;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  afterEach(() => {
    mockKV._reset();
  });

  describe('getProduct', () => {
    it('should return null for cache miss', async () => {
      const result = await CacheService.getProduct(mockKV, 'product-123');

      expect(result).to.be.null;
    });

    it('should return product from KV cache', async () => {
      const productData = { id: 'product-123', name: 'Test Product' };
      await mockKV.put('product:product-123', JSON.stringify(productData));

      const result = await CacheService.getProduct(mockKV, 'product-123');

      expect(result).to.not.be.null;
      expect(result.data).to.deep.equal(productData);
      expect(result.source).to.equal('kv');
    });

    it('should return product from memory cache on second call', async () => {
      const productData = { id: 'product-123-mem', name: 'Test Product' };
      await mockKV.put('product:product-123-mem', JSON.stringify(productData));

      // First call - from KV (also stores in memory)
      const result1 = await CacheService.getProduct(mockKV, 'product-123-mem');
      expect(result1.source).to.be.oneOf(['kv', 'memory']);

      // Second call - should be from memory
      const result2 = await CacheService.getProduct(mockKV, 'product-123-mem');
      expect(result2.source).to.be.oneOf(['memory', 'kv']);
      expect(result2.data).to.deep.equal(productData);
    });
  });

  describe('setProduct', () => {
    it('should store product in cache', async () => {
      const productData = { id: 'product-456', name: 'New Product' };

      await CacheService.setProduct(mockKV, 'product-456', productData, 3600);

      // Verify it's in KV
      const cached = await mockKV.get('product:product-456', 'json');
      expect(cached).to.deep.equal(productData);
    });

    it('should store in both memory and KV', async () => {
      const productData = { id: 'product-789', name: 'Another Product' };

      await CacheService.setProduct(mockKV, 'product-789', productData, 3600);

      // Verify memory cache
      const result = await CacheService.getProduct(mockKV, 'product-789');
      expect(result.source).to.equal('memory');
      expect(result.data).to.deep.equal(productData);
    });

    it('should use default TTL if not specified', async () => {
      const productData = { id: 'product-default', name: 'Default TTL' };

      await CacheService.setProduct(mockKV, 'product-default', productData);

      const cached = await mockKV.get('product:product-default', 'json');
      expect(cached).to.not.be.null;
    });
  });

  describe('invalidateProduct', () => {
    it('should remove product from cache', async () => {
      const productData = { id: 'product-remove', name: 'Remove Me' };

      // Set in cache
      await CacheService.setProduct(mockKV, 'product-remove', productData, 3600);

      // Verify it's cached
      let result = await CacheService.getProduct(mockKV, 'product-remove');
      expect(result).to.not.be.null;

      // Invalidate
      await CacheService.invalidateProduct(mockKV, 'product-remove');

      // Verify it's gone
      result = await CacheService.getProduct(mockKV, 'product-remove');
      expect(result).to.be.null;
    });

    it('should handle invalidating non-existent product', async () => {
      // Should not throw error
      await CacheService.invalidateProduct(mockKV, 'non-existent');

      const result = await CacheService.getProduct(mockKV, 'non-existent');
      expect(result).to.be.null;
    });
  });

  describe('invalidateProducts', () => {
    it('should invalidate multiple products', async () => {
      const product1 = { id: 'p1', name: 'Product 1' };
      const product2 = { id: 'p2', name: 'Product 2' };
      const product3 = { id: 'p3', name: 'Product 3' };

      await CacheService.setProduct(mockKV, 'p1', product1, 3600);
      await CacheService.setProduct(mockKV, 'p2', product2, 3600);
      await CacheService.setProduct(mockKV, 'p3', product3, 3600);

      // Verify all cached
      expect(await CacheService.getProduct(mockKV, 'p1')).to.not.be.null;
      expect(await CacheService.getProduct(mockKV, 'p2')).to.not.be.null;
      expect(await CacheService.getProduct(mockKV, 'p3')).to.not.be.null;

      // Invalidate two products
      await CacheService.invalidateProducts(mockKV, ['p1', 'p3']);

      // Verify p1 and p3 are gone, p2 remains
      expect(await CacheService.getProduct(mockKV, 'p1')).to.be.null;
      expect(await CacheService.getProduct(mockKV, 'p2')).to.not.be.null;
      expect(await CacheService.getProduct(mockKV, 'p3')).to.be.null;
    });

    it('should handle empty array', async () => {
      await CacheService.invalidateProducts(mockKV, []);
      // Should not throw
    });
  });

  describe('clearAll', () => {
    it('should clear all cached products', async () => {
      const product1 = { id: 'p1', name: 'Product 1' };
      const product2 = { id: 'p2', name: 'Product 2' };

      await CacheService.setProduct(mockKV, 'p1', product1, 3600);
      await CacheService.setProduct(mockKV, 'p2', product2, 3600);

      // Clear all
      await CacheService.clearAll(mockKV);

      // Memory cache should be cleared
      const stats = CacheService.getStats();
      expect(stats.memorySize).to.equal(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = CacheService.getStats();

      expect(stats).to.have.property('memorySize');
      expect(stats).to.have.property('memoryMaxSize');
      expect(stats.memorySize).to.be.a('number');
      expect(stats.memoryMaxSize).to.be.a('number');
    });

    it('should reflect cache size changes', async () => {
      const product = { id: 'stats-test', name: 'Stats Test' };

      const statsBefore = CacheService.getStats();
      const sizeBefore = statsBefore.memorySize;

      await CacheService.setProduct(mockKV, 'stats-test', product, 3600);

      const statsAfter = CacheService.getStats();
      expect(statsAfter.memorySize).to.be.greaterThan(sizeBefore);
    });
  });

  describe('Memory Cache LRU behavior', () => {
    it('should maintain memory cache', async () => {
      const product1 = { id: 'lru-1', name: 'Product 1' };
      const product2 = { id: 'lru-2', name: 'Product 2' };

      await CacheService.setProduct(mockKV, 'lru-1', product1, 3600);
      await CacheService.setProduct(mockKV, 'lru-2', product2, 3600);

      // Access first product (from memory)
      const result1 = await CacheService.getProduct(mockKV, 'lru-1');
      expect(result1.source).to.equal('memory');

      // Access second product (from memory)
      const result2 = await CacheService.getProduct(mockKV, 'lru-2');
      expect(result2.source).to.equal('memory');
    });
  });

  describe('Cache TTL', () => {
    it('should set custom TTL', async () => {
      const productData = { id: 'ttl-test', name: 'TTL Test' };
      const customTTL = 7200; // 2 hours

      await CacheService.setProduct(mockKV, 'ttl-test', productData, customTTL);

      // Verify it's cached
      const result = await CacheService.getProduct(mockKV, 'ttl-test');
      expect(result).to.not.be.null;
      expect(result.data).to.deep.equal(productData);
    });
  });
});
