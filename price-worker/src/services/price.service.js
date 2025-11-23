import { PriceModel } from '../models/price.model.js';

/**
 * Price service with caching
 */

export const PriceService = {
  /**
   * Set or update price for a product
   */
  async setPrice(env, productId, price, currency = 'INR') {
    const result = await PriceModel.upsertPrice(env.DB, productId, price, currency);

    // Cache the price
    await env.PRICE_CACHE.put(
      `price:${productId}`,
      JSON.stringify({ productId, price, currency }),
      { expirationTtl: parseInt(env.CACHE_TTL_SECONDS || 3600) }
    );

    return result;
  },

  /**
   * Get price for a product (with caching)
   */
  async getPrice(env, productId) {
    // Try cache first
    const cached = await env.PRICE_CACHE.get(`price:${productId}`, 'json');
    if (cached) {
      return { ...cached, _cached: true };
    }

    // Get from database
    const price = await PriceModel.getPrice(env.DB, productId);

    if (!price) {
      return null;
    }

    // Cache for future requests
    await env.PRICE_CACHE.put(`price:${productId}`, JSON.stringify(price), {
      expirationTtl: parseInt(env.CACHE_TTL_SECONDS || 3600),
    });

    return { ...price, _cached: false };
  },

  /**
   * Get prices for multiple products
   */
  async getPrices(env, productIds) {
    // Try to get from cache first
    const prices = [];
    const missingIds = [];

    for (const productId of productIds) {
      const cached = await env.PRICE_CACHE.get(`price:${productId}`, 'json');
      if (cached) {
        prices.push({ ...cached, _cached: true });
      } else {
        missingIds.push(productId);
      }
    }

    // Get missing prices from database
    if (missingIds.length > 0) {
      const dbPrices = await PriceModel.getPrices(env.DB, missingIds);

      // Cache them
      for (const price of dbPrices) {
        await env.PRICE_CACHE.put(`price:${price.product_id}`, JSON.stringify(price), {
          expirationTtl: parseInt(env.CACHE_TTL_SECONDS || 3600),
        });
        prices.push({ ...price, _cached: false });
      }
    }

    return prices;
  },

  /**
   * Check if price has changed since a given timestamp
   */
  async hasChanged(env, productId, sinceTimestamp) {
    const currentPrice = await this.getPrice(env, productId);

    if (!currentPrice) {
      return { changed: true, reason: 'Product price not found' };
    }

    if (currentPrice.updated_at > sinceTimestamp) {
      return {
        changed: true,
        reason: 'Price updated',
        currentPrice: currentPrice.price,
        updatedAt: currentPrice.updated_at,
      };
    }

    return { changed: false };
  },
};
