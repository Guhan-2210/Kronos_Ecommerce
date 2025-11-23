import { ProductService } from '../services/product.service.js';
import {
  successResponse,
  errorResponse,
  parsePaginationParams,
  parseFilterParams,
  validateImageContentType,
  extractFilename,
} from '../utils/helpers.js';

/**
 * Product controller for itty-router
 */

export const ProductController = {
  /**
   * Create a new product (with optional image upload)
   * POST /products
   * Accepts: JSON or multipart/form-data
   */
  async create(request, env) {
    try {
      let productData;
      let imageFile = null;

      const contentType = request.headers.get('content-type') || '';

      // Handle form-data (with optional image)
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();

        // Get product data (as JSON string in 'data' field)
        const dataField = formData.get('data');
        if (!dataField) {
          return new Response(
            JSON.stringify(
              errorResponse(
                'Missing "data" field in form-data. Product data should be sent as JSON string in "data" field.',
                400
              )
            ),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        try {
          const cleanData =
            typeof dataField === 'string' ? dataField.trim() : String(dataField).trim();

          productData = JSON.parse(cleanData);
        } catch (parseError) {
          return new Response(
            JSON.stringify(
              errorResponse(`Invalid JSON in "data" field: ${parseError.message}`, 400, {
                received: dataField?.substring(0, 100),
                parseError: parseError.message,
              })
            ),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Get optional image file
        imageFile = formData.get('image');

        // Validate image if provided
        if (imageFile) {
          if (!validateImageContentType(imageFile.type)) {
            return new Response(
              JSON.stringify(
                errorResponse('Invalid image type. Allowed: JPEG, PNG, WebP, GIF', 400)
              ),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      } else {
        // Handle regular JSON body - use validated data if available
        productData = request.validatedData || (await request.json());
      }

      // If image is provided, upload it first and add URL to product data
      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to R2
        const { ImageService } = await import('../services/image.service.js');
        const key = await ImageService.uploadImage(
          env.prod_images,
          buffer,
          imageFile.name,
          imageFile.type
        );

        const imageUrl = ImageService.getPublicUrl(env.R2_PUBLIC_URL, key);

        // Add image URL to product data
        productData.media = {
          ...productData.media,
          image: imageUrl,
        };
      }

      // Create product
      const product = await ProductService.createProduct(env, productData);

      return new Response(
        JSON.stringify(successResponse(product, 'Product created successfully')),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Create product error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to create product', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get all products with pagination and filters
   * GET /products
   */
  async getAll(request, env) {
    try {
      const url = new URL(request.url);
      const searchParams = url.searchParams;

      const pagination = parsePaginationParams(searchParams);
      const filters = parseFilterParams(searchParams);

      const result = await ProductService.getAllProducts(env, {
        ...pagination,
        ...filters,
      });

      return new Response(
        JSON.stringify(
          successResponse(result.data, 'Products retrieved successfully', {
            pagination: result.pagination,
          })
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Get all products error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to retrieve products', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Get product by ID
   * GET /products/:id
   */
  async getById(request, env) {
    try {
      const productId = request.params.id;

      const product = await ProductService.getProductById(env, productId);

      if (!product) {
        return new Response(JSON.stringify(errorResponse('Product not found', 404)), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify(successResponse(product, 'Product retrieved successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Get product error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to retrieve product', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Update product
   * PUT /products/:id
   */
  async update(request, env) {
    try {
      const productId = request.params.id;
      const updates = request.validatedData || (await request.json());

      const product = await ProductService.updateProduct(env, productId, updates);

      if (!product) {
        return new Response(JSON.stringify(errorResponse('Product not found', 404)), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify(successResponse(product, 'Product updated successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Update product error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to update product', 400)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Delete product
   * DELETE /products/:id
   */
  async delete(request, env) {
    try {
      const productId = request.params.id;

      const deleted = await ProductService.deleteProduct(env, productId);

      if (!deleted) {
        return new Response(JSON.stringify(errorResponse('Product not found', 404)), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(successResponse(null, 'Product deleted successfully')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Delete product error:', error);
      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to delete product', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  /**
   * Upload product image
   * POST /products/:id/image
   */
  async uploadImage(request, env) {
    try {
      const productId = request.params.id;

      // Get form data
      const formData = await request.formData();
      const file = formData.get('image');

      if (!file) {
        return new Response(JSON.stringify(errorResponse('No image file provided', 400)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate file type
      if (!validateImageContentType(file.type)) {
        return new Response(
          JSON.stringify(errorResponse('Invalid image type. Allowed: JPEG, PNG, WebP, GIF', 400)),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Upload image
      const imageUrl = await ProductService.uploadProductImage(
        env,
        productId,
        buffer,
        file.name,
        file.type
      );

      return new Response(
        JSON.stringify(successResponse({ imageUrl }, 'Image uploaded successfully')),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Upload image error:', error);

      if (error.message === 'Product not found') {
        return new Response(JSON.stringify(errorResponse(error.message, 404)), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify(errorResponse(error.message || 'Failed to upload image', 500)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
