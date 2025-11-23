import { ProductModel } from '../models/product.model.js';
import { CacheService } from './cache.service.js';
import { ImageService } from './image.service.js';
import { generateId } from '../utils/helpers.js';

/**
 * Product service layer
 */

export const ProductService = {
  /**
   * Create a new product
   */
  async createProduct(env, productData) {
    const productId = generateId();

    // Validate required fields
    this.validateProductData(productData);

    // Add metadata
    const enrichedData = {
      ...productData,
      id: productId,
    };

    // Save to database
    await ProductModel.create(env.DB, productId, enrichedData);

    // Get the created product
    const product = await ProductModel.getById(env.DB, productId);

    // Cache the product
    await CacheService.setProduct(
      env.SKU_CACHE,
      productId,
      product,
      parseInt(env.CACHE_TTL_SECONDS || 3600)
    );

    return product;
  },

  /**
   * Get product by ID
   */
  async getProductById(env, productId) {
    // Try cache first
    const cached = await CacheService.getProduct(env.SKU_CACHE, productId);
    if (cached) {
      return {
        ...cached.data,
        _cached: true,
        _cacheSource: cached.source,
      };
    }

    // Get from database
    const product = await ProductModel.getById(env.DB, productId);

    if (!product) {
      return null;
    }

    // Cache for future requests
    await CacheService.setProduct(
      env.SKU_CACHE,
      productId,
      product,
      parseInt(env.CACHE_TTL_SECONDS || 3600)
    );

    return {
      ...product,
      _cached: false,
    };
  },

  /**
   * Get all products with filters and pagination
   */
  async getAllProducts(env, filters) {
    return await ProductModel.getAll(env.DB, filters);
  },

  /**
   * Update product
   */
  async updateProduct(env, productId, updates) {
    // Check if product exists
    const exists = await ProductModel.exists(env.DB, productId);
    if (!exists) {
      return null;
    }

    // Get current product
    const currentProduct = await ProductModel.getById(env.DB, productId);

    // Merge updates with existing data
    const updatedData = {
      ...currentProduct.product_data,
      ...updates,
      id: productId, // Ensure ID doesn't change
    };

    // Validate updated data
    this.validateProductData(updatedData);

    // Update in database
    await ProductModel.update(env.DB, productId, updatedData);

    // Invalidate cache
    await CacheService.invalidateProduct(env.SKU_CACHE, productId);

    // Get updated product
    const product = await ProductModel.getById(env.DB, productId);

    // Update cache
    await CacheService.setProduct(
      env.SKU_CACHE,
      productId,
      product,
      parseInt(env.CACHE_TTL_SECONDS || 3600)
    );

    return product;
  },

  /**
   * Delete product
   */
  async deleteProduct(env, productId) {
    // Check if product exists
    const product = await ProductModel.getById(env.DB, productId);
    if (!product) {
      return false;
    }

    // Delete associated images
    if (product.product_data.media?.image) {
      await ImageService.deleteProductImages(
        env.prod_images,
        product.product_data,
        env.R2_PUBLIC_URL
      );
    }

    // Delete from database
    await ProductModel.delete(env.DB, productId);

    // Invalidate cache
    await CacheService.invalidateProduct(env.SKU_CACHE, productId);

    return true;
  },

  /**
   * Upload product image
   */
  async uploadProductImage(env, productId, imageBuffer, filename, contentType) {
    // Check if product exists
    const product = await ProductModel.getById(env.DB, productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Delete old images if they exist
    if (product.product_data.media?.image) {
      await ImageService.deleteProductImages(
        env.prod_images,
        product.product_data,
        env.R2_PUBLIC_URL
      );
    }

    // Upload new image
    const key = await ImageService.uploadImage(env.prod_images, imageBuffer, filename, contentType);

    // Get public URL
    const imageUrl = ImageService.getPublicUrl(env.R2_PUBLIC_URL, key);

    // Update product with image URL
    const updatedData = {
      ...product.product_data,
      media: {
        ...product.product_data.media,
        image: imageUrl,
      },
    };

    await ProductModel.update(env.DB, productId, updatedData);

    // Invalidate cache
    await CacheService.invalidateProduct(env.SKU_CACHE, productId);

    return imageUrl;
  },

  /**
   * Validate product data
   */
  validateProductData(data) {
    const required = ['name', 'brand', 'model', 'sku'];

    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return true;
  },
};
