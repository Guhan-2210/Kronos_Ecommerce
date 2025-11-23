import { Hono } from 'hono';
import { ProductController } from '../controllers/product.controller.js';

const products = new Hono();

/**
 * Product routes
 */

// Get all products (with pagination and filters)
products.get('/', ProductController.getAll);

// Get product by ID
products.get('/:id', ProductController.getById);

// Create new product
products.post('/', ProductController.create);

// Update product
products.put('/:id', ProductController.update);

// Delete product
products.delete('/:id', ProductController.delete);

// Upload product image
products.post('/:id/image', ProductController.uploadImage);

export default products;
