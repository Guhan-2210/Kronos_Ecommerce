import { Hono } from 'hono';
import { CartController } from '../controllers/cart.controller.js';

const cart = new Hono();

// Add to cart
cart.post('/add', CartController.addToCart);

// Get cart with validation
cart.get('/:cartId', CartController.getCart);

// Update quantity
cart.put('/:cartId/quantity', CartController.updateQuantity);

// Remove product
cart.delete('/:cartId/product/:productId', CartController.removeProduct);

// Add addresses
cart.post('/:cartId/shipping-address', CartController.addShippingAddress);
cart.post('/:cartId/billing-address', CartController.addBillingAddress);

// Get order summary
cart.get('/:cartId/summary', CartController.getOrderSummary);

export default cart;
