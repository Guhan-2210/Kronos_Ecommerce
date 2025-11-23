/**
 * Caching service with KV and in-memory caching
 */

class MemoryCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Move to end of access order (LRU)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    return this.cache.get(key);
  }

  set(key, value) {
    // If cache is full, remove least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
    }

    this.cache.set(key, value);

    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

// Create a single memory cache instance
const memoryCache = new MemoryCache(100);

export const CacheService = {
  /**
   * Get product from cache (tries memory first, then KV)
   */
  async getProduct(kv, productId) {
    // Try memory cache first
    const memCached = memoryCache.get(`product:${productId}`);
    if (memCached) {
      return {
        data: memCached,
        source: 'memory',
      };
    }

    // Try KV cache
    const kvCached = await kv.get(`product:${productId}`, 'json');
    if (kvCached) {
      // Store in memory cache for future requests
      memoryCache.set(`product:${productId}`, kvCached);
      return {
        data: kvCached,
        source: 'kv',
      };
    }

    return null;
  },

  /**
   * Set product in cache (both memory and KV)
   */
  async setProduct(kv, productId, productData, ttl = 3600) {
    // Store in memory cache
    memoryCache.set(`product:${productId}`, productData);

    // Store in KV with TTL
    await kv.put(`product:${productId}`, JSON.stringify(productData), { expirationTtl: ttl });
  },

  /**
   * Invalidate product cache
   */
  async invalidateProduct(kv, productId) {
    // Remove from memory cache
    memoryCache.delete(`product:${productId}`);

    // Remove from KV cache
    await kv.delete(`product:${productId}`);
  },

  /**
   * Invalidate multiple products
   */
  async invalidateProducts(kv, productIds) {
    for (const productId of productIds) {
      await this.invalidateProduct(kv, productId);
    }
  },

  /**
   * Clear all product caches
   */
  async clearAll(kv) {
    // Clear memory cache
    memoryCache.clear();

    // Note: KV doesn't have a clear all method
    // Products will expire based on their TTL
  },

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: memoryCache.size(),
      memoryMaxSize: memoryCache.maxSize,
    };
  },
};
