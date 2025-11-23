import { Hono } from 'hono';
import { PriceController } from '../controllers/price.controller.js';

const prices = new Hono();

// Set/update price
prices.post('/', PriceController.setPrice);

// Get price for single product
prices.get('/:productId', PriceController.getPrice);

// Get prices for multiple products
prices.post('/batch', PriceController.getBatchPrices);

// Check if price changed
prices.get('/:productId/changed', PriceController.checkPriceChange);

// Get price history
prices.get('/:productId/history', PriceController.getPriceHistory);

export default prices;
