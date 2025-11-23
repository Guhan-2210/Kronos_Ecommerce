import { PriceService } from '../services/price.service.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Price controller for itty-router
 */

export const PriceController = {
  /**
   * Set or update price for a product
   * POST /prices/set
   */
  async setPrice(request, env) {
    try {
      const data = request.validatedData || (await request.json());

      const result = await PriceService.setPrice(
        env,
        data.product_id,
        parseFloat(data.price),
        data.currency || 'INR'
      );

      return new Response(
        JSON.stringify(
          successResponse(result, `Price ${result.updated ? 'updated' : 'created'} successfully`)
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Set price error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to set price', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get price for a single product
   * GET /prices/product/:productId
   */
  async getByProductId(request, env) {
    try {
      const productId = request.params.productId;

      const price = await PriceService.getPrice(env, productId);

      if (!price) {
        return new Response(JSON.stringify(errorResponse('Price not found', 404)), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(successResponse(price, 'Price retrieved successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get price error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to retrieve price', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get prices for multiple products
   * POST /prices/batch
   */
  async getBatch(request, env) {
    try {
      const data = request.validatedData || (await request.json());

      const prices = await PriceService.getPrices(env, data.product_ids);

      return new Response(
        JSON.stringify(successResponse(prices, 'Prices retrieved successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Get batch prices error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to retrieve prices', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
