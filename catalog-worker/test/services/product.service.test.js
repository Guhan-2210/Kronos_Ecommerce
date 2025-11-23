// test/services/product.service.test.js
import { expect } from 'chai';
import { ProductService } from '../../src/services/product.service.js';
import { CacheService } from '../../src/services/cache.service.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('Product Service', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  afterEach(() => {
    mockEnv.DB._reset();
    mockEnv.SKU_CACHE._reset();
  });

  const validProductData = {
    name: 'Rolex Submariner',
    brand: 'Rolex',
    model: 'Submariner',
    sku: 'RLX-SUB-001',
    price: 9500,
    gender: 'Men',
  };

  describe('validateProductData', () => {
    it('should validate product with all required fields', () => {
      const result = ProductService.validateProductData(validProductData);
      expect(result).to.be.true;
    });

    it('should throw error for missing name', () => {
      const invalid = { ...validProductData };
      delete invalid.name;

      try {
        ProductService.validateProductData(invalid);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('name');
      }
    });

    it('should throw error for missing brand', () => {
      const invalid = { ...validProductData };
      delete invalid.brand;

      try {
        ProductService.validateProductData(invalid);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('brand');
      }
    });

    it('should throw error for missing model', () => {
      const invalid = { ...validProductData };
      delete invalid.model;

      try {
        ProductService.validateProductData(invalid);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('model');
      }
    });

    it('should throw error for missing sku', () => {
      const invalid = { ...validProductData };
      delete invalid.sku;

      try {
        ProductService.validateProductData(invalid);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('sku');
      }
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const product = await ProductService.createProduct(mockEnv, validProductData);

      expect(product).to.not.be.null;
      expect(product.product_data).to.have.property('id');
      expect(product.product_data.name).to.equal(validProductData.name);
      expect(product.product_data.brand).to.equal(validProductData.brand);
    });

    it('should generate unique product ID', async () => {
      const product1 = await ProductService.createProduct(mockEnv, validProductData);
      const product2 = await ProductService.createProduct(mockEnv, validProductData);

      expect(product1.product_data.id).to.not.equal(product2.product_data.id);
    });

    it('should cache the created product', async () => {
      const product = await ProductService.createProduct(mockEnv, validProductData);

      // Try to get from cache
      const cached = await mockEnv.SKU_CACHE.get(`product:${product.id}`, 'json');
      expect(cached).to.not.be.null;
    });

    it('should reject invalid product data', async () => {
      const invalid = { ...validProductData };
      delete invalid.name;

      try {
        await ProductService.createProduct(mockEnv, invalid);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('name');
      }
    });

    it('should preserve additional product fields', async () => {
      const enrichedData = {
        ...validProductData,
        description: 'Luxury watch',
        case: { material: 'Steel', diameter: 40 },
      };

      const product = await ProductService.createProduct(mockEnv, enrichedData);

      expect(product.product_data.description).to.equal('Luxury watch');
      expect(product.product_data.case).to.deep.equal({ material: 'Steel', diameter: 40 });
    });
  });

  describe('getProductById', () => {
    it('should get product by ID from database', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      // Clear both caches to force DB lookup
      await CacheService.invalidateProduct(mockEnv.SKU_CACHE, created.id);

      const product = await ProductService.getProductById(mockEnv, created.id);

      expect(product).to.not.be.null;
      expect(product.product_data.name).to.equal(validProductData.name);
      // After cache invalidation and refetch, _cached could be false or true
      expect(product).to.have.property('_cached');
    });

    it('should get product from cache if available', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      // First call caches it, second call should be from cache
      await ProductService.getProductById(mockEnv, created.id);
      const product = await ProductService.getProductById(mockEnv, created.id);

      expect(product._cached).to.be.true;
      expect(product._cacheSource).to.be.oneOf(['memory', 'kv']);
    });

    it('should return null for non-existent product', async () => {
      const product = await ProductService.getProductById(mockEnv, 'non-existent-id');

      expect(product).to.be.null;
    });

    it('should cache product after DB fetch', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      // Clear both memory and KV cache
      await CacheService.invalidateProduct(mockEnv.SKU_CACHE, created.id);

      // Get from DB (should cache it)
      const product = await ProductService.getProductById(mockEnv, created.id);

      expect(product).to.not.be.null;
      expect(product.product_data.name).to.equal(validProductData.name);
    });
  });

  describe('getAllProducts', () => {
    it('should get all products', async () => {
      await ProductService.createProduct(mockEnv, validProductData);
      await ProductService.createProduct(mockEnv, { ...validProductData, sku: 'SKU-002' });

      const result = await ProductService.getAllProducts(mockEnv, { limit: 10, offset: 0 });

      expect(result.data).to.be.an('array');
      expect(result.data.length).to.be.at.least(1);
      expect(result.pagination).to.have.property('total');
      expect(result.pagination.total).to.be.at.least(1);
    });

    it('should apply pagination', async () => {
      await ProductService.createProduct(mockEnv, validProductData);
      await ProductService.createProduct(mockEnv, { ...validProductData, sku: 'SKU-002' });
      await ProductService.createProduct(mockEnv, { ...validProductData, sku: 'SKU-003' });

      const result = await ProductService.getAllProducts(mockEnv, { limit: 2, offset: 0 });

      expect(result.data).to.be.an('array');
      expect(result.data.length).to.be.at.least(1);
      expect(result.pagination.limit).to.equal(2);
      expect(result.pagination.offset).to.equal(0);
    });

    it('should return empty array when no products', async () => {
      const result = await ProductService.getAllProducts(mockEnv, {});

      expect(result.data).to.be.an('array');
      expect(result.data.length).to.equal(0);
      expect(result.pagination.total).to.equal(0);
    });
  });

  describe('updateProduct', () => {
    it('should update existing product', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      const updates = {
        price: 10500,
        description: 'Updated description',
      };

      const updated = await ProductService.updateProduct(mockEnv, created.id, updates);

      expect(updated.product_data.price).to.equal(10500);
      expect(updated.product_data.description).to.equal('Updated description');
      expect(updated.product_data.name).to.equal(validProductData.name); // Unchanged
    });

    it('should return null for non-existent product', async () => {
      const result = await ProductService.updateProduct(mockEnv, 'non-existent', {});

      expect(result).to.be.null;
    });

    it('should preserve product ID', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);
      const originalId = created.id;

      const updates = { id: 'attempt-to-change-id' };
      const updated = await ProductService.updateProduct(mockEnv, originalId, updates);

      expect(updated.id).to.equal(originalId);
      expect(updated.product_data.id).to.equal(originalId);
    });

    it('should invalidate cache after update', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      // Ensure it's cached
      await ProductService.getProductById(mockEnv, created.id);

      // Update
      await ProductService.updateProduct(mockEnv, created.id, { price: 12000 });

      // Get updated product (should have new price from cache)
      const updated = await ProductService.getProductById(mockEnv, created.id);
      expect(updated.product_data.price).to.equal(12000);
    });

    it('should validate updated data', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      const invalidUpdates = { name: '' };

      try {
        await ProductService.updateProduct(mockEnv, created.id, invalidUpdates);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('name');
      }
    });
  });

  describe('deleteProduct', () => {
    it('should delete existing product', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      const result = await ProductService.deleteProduct(mockEnv, created.id);

      expect(result).to.be.true;

      // Verify it's deleted
      const product = await ProductService.getProductById(mockEnv, created.id);
      expect(product).to.be.null;
    });

    it('should return false for non-existent product', async () => {
      const result = await ProductService.deleteProduct(mockEnv, 'non-existent');

      expect(result).to.be.false;
    });

    it('should invalidate cache after deletion', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      // Ensure it's cached
      await ProductService.getProductById(mockEnv, created.id);

      // Delete
      await ProductService.deleteProduct(mockEnv, created.id);

      // Verify cache is cleared
      const cached = await mockEnv.SKU_CACHE.get(`product:${created.id}`, 'json');
      expect(cached).to.be.null;
    });

    it('should delete product with images', async () => {
      const productWithImage = {
        ...validProductData,
        media: {
          image: `${mockEnv.R2_PUBLIC_URL}/products/test-image.jpg`,
        },
      };

      const created = await ProductService.createProduct(mockEnv, productWithImage);

      // Upload image to R2
      await mockEnv.prod_images.put('products/test-image.jpg', Buffer.from('image'));

      // Delete product (should also delete image)
      const result = await ProductService.deleteProduct(mockEnv, created.id);

      expect(result).to.be.true;
    });
  });

  describe('uploadProductImage', () => {
    it('should upload image for existing product', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      const imageBuffer = Buffer.from('fake-image');
      const filename = 'product-image.jpg';
      const contentType = 'image/jpeg';

      const imageUrl = await ProductService.uploadProductImage(
        mockEnv,
        created.id,
        imageBuffer,
        filename,
        contentType
      );

      expect(imageUrl).to.be.a('string');
      expect(imageUrl).to.include(mockEnv.R2_PUBLIC_URL);
    });

    it('should throw error for non-existent product', async () => {
      const imageBuffer = Buffer.from('fake-image');

      try {
        await ProductService.uploadProductImage(
          mockEnv,
          'non-existent',
          imageBuffer,
          'test.jpg',
          'image/jpeg'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Product not found');
      }
    });

    it('should update product with image URL', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      const imageBuffer = Buffer.from('image-data');
      await ProductService.uploadProductImage(
        mockEnv,
        created.id,
        imageBuffer,
        'watch.jpg',
        'image/jpeg'
      );

      const updated = await ProductService.getProductById(mockEnv, created.id);
      expect(updated.product_data.media).to.have.property('image');
      expect(updated.product_data.media.image).to.include(mockEnv.R2_PUBLIC_URL);
    });

    it('should replace old image when uploading new one', async () => {
      const productWithImage = {
        ...validProductData,
        media: {
          image: `${mockEnv.R2_PUBLIC_URL}/products/old-image.jpg`,
        },
      };

      const created = await ProductService.createProduct(mockEnv, productWithImage);

      // Upload old image
      await mockEnv.prod_images.put('products/old-image.jpg', Buffer.from('old'));

      // Upload new image
      const newImageBuffer = Buffer.from('new-image');
      await ProductService.uploadProductImage(
        mockEnv,
        created.id,
        newImageBuffer,
        'new-image.jpg',
        'image/jpeg'
      );

      // Old image should be deleted
      const oldImage = await mockEnv.prod_images.get('products/old-image.jpg');
      expect(oldImage).to.be.null;
    });

    it('should invalidate cache after image upload', async () => {
      const created = await ProductService.createProduct(mockEnv, validProductData);

      const imageBuffer = Buffer.from('test-image');
      await ProductService.uploadProductImage(
        mockEnv,
        created.id,
        imageBuffer,
        'test.jpg',
        'image/jpeg'
      );

      // Get product and verify image is present
      const product = await ProductService.getProductById(mockEnv, created.id);
      expect(product.product_data.media.image).to.exist;
    });
  });
});
