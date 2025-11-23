// test/services/image.service.test.js
import { expect } from 'chai';
import { ImageService } from '../../src/services/image.service.js';
import { createMockR2 } from '../helpers/mock-env.js';

describe('Image Service', () => {
  let mockR2;
  const testPublicUrl = 'https://test-cdn.com';

  beforeEach(() => {
    mockR2 = createMockR2();
  });

  afterEach(() => {
    mockR2._reset();
  });

  describe('uploadImage', () => {
    it('should upload image to R2', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'test-image.jpg';
      const contentType = 'image/jpeg';

      const key = await ImageService.uploadImage(mockR2, imageBuffer, filename, contentType);

      expect(key).to.be.a('string');
      expect(key).to.include('products/');
      expect(key).to.include(filename);
    });

    it('should use default content type if not provided', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'test.jpg';

      const key = await ImageService.uploadImage(mockR2, imageBuffer, filename);

      expect(key).to.be.a('string');
      expect(key).to.include(filename);
    });

    it('should generate unique keys for same filename', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'same-name.jpg';

      const key1 = await ImageService.uploadImage(mockR2, imageBuffer, filename);

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const key2 = await ImageService.uploadImage(mockR2, imageBuffer, filename);

      expect(key1).to.not.equal(key2);
    });

    it('should throw error on upload failure', async () => {
      const badR2 = {
        put: async () => {
          throw new Error('Upload failed');
        },
      };

      const imageBuffer = Buffer.from('data');

      try {
        await ImageService.uploadImage(badR2, imageBuffer, 'test.jpg');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to upload image');
      }
    });

    it('should store image with correct metadata', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'metadata-test.png';
      const contentType = 'image/png';

      const key = await ImageService.uploadImage(mockR2, imageBuffer, filename, contentType);

      const stored = await mockR2.get(key);
      expect(stored).to.not.be.null;
      expect(stored.httpMetadata.contentType).to.equal(contentType);
    });
  });

  describe('getPublicUrl', () => {
    it('should construct public URL', () => {
      const key = 'products/123-image.jpg';
      const url = ImageService.getPublicUrl(testPublicUrl, key);

      expect(url).to.equal(`${testPublicUrl}/${key}`);
    });

    it('should handle different keys', () => {
      const key = 'products/2024/01/test.png';
      const url = ImageService.getPublicUrl(testPublicUrl, key);

      expect(url).to.equal(`${testPublicUrl}/${key}`);
    });

    it('should work with different public URLs', () => {
      const key = 'products/image.jpg';
      const customUrl = 'https://custom-cdn.example.com';
      const url = ImageService.getPublicUrl(customUrl, key);

      expect(url).to.equal(`${customUrl}/${key}`);
    });
  });

  describe('deleteImage', () => {
    it('should delete image from R2', async () => {
      const imageBuffer = Buffer.from('to-delete');
      const key = 'products/delete-me.jpg';

      await mockR2.put(key, imageBuffer);
      expect(await mockR2.get(key)).to.not.be.null;

      const result = await ImageService.deleteImage(mockR2, key);

      expect(result).to.be.true;
      expect(await mockR2.get(key)).to.be.null;
    });

    it('should handle deletion of non-existent image', async () => {
      const result = await ImageService.deleteImage(mockR2, 'non-existent-key');

      expect(result).to.be.true;
    });

    it('should handle deletion errors', async () => {
      const badR2 = {
        delete: async () => {
          throw new Error('Delete failed');
        },
      };

      const result = await ImageService.deleteImage(badR2, 'some-key');

      expect(result).to.be.false;
    });
  });

  describe('getImage', () => {
    it('should retrieve image from R2', async () => {
      const imageBuffer = Buffer.from('image-content');
      const key = 'products/get-test.jpg';
      const contentType = 'image/jpeg';

      await mockR2.put(key, imageBuffer, {
        httpMetadata: { contentType },
      });

      const result = await ImageService.getImage(mockR2, key);

      expect(result).to.not.be.null;
      expect(result.body).to.deep.equal(imageBuffer);
      expect(result.contentType).to.equal(contentType);
    });

    it('should return null for non-existent image', async () => {
      const result = await ImageService.getImage(mockR2, 'does-not-exist.jpg');

      expect(result).to.be.null;
    });

    it('should use default content type if not set', async () => {
      const imageBuffer = Buffer.from('no-content-type');
      const key = 'products/no-ct.jpg';

      await mockR2.put(key, imageBuffer, {
        httpMetadata: {},
      });

      const result = await ImageService.getImage(mockR2, key);

      expect(result.contentType).to.equal('image/jpeg');
    });

    it('should handle get errors', async () => {
      const badR2 = {
        get: async () => {
          throw new Error('Get failed');
        },
      };

      const result = await ImageService.getImage(badR2, 'some-key');

      expect(result).to.be.null;
    });
  });

  describe('extractImageKeys', () => {
    it('should extract image key from product data', () => {
      const productData = {
        media: {
          image: `${testPublicUrl}/products/123-watch.jpg`,
        },
      };

      const keys = ImageService.extractImageKeys(productData, testPublicUrl);

      expect(keys).to.be.an('array');
      expect(keys.length).to.equal(1);
      expect(keys[0]).to.equal('products/123-watch.jpg');
    });

    it('should return empty array if no image', () => {
      const productData = {
        media: {},
      };

      const keys = ImageService.extractImageKeys(productData, testPublicUrl);

      expect(keys).to.be.an('array');
      expect(keys.length).to.equal(0);
    });

    it('should ignore external image URLs', () => {
      const productData = {
        media: {
          image: 'https://external-cdn.com/image.jpg',
        },
      };

      const keys = ImageService.extractImageKeys(productData, testPublicUrl);

      expect(keys.length).to.equal(0);
    });

    it('should handle missing media object', () => {
      const productData = {};

      const keys = ImageService.extractImageKeys(productData, testPublicUrl);

      expect(keys).to.be.an('array');
      expect(keys.length).to.equal(0);
    });
  });

  describe('deleteProductImages', () => {
    it('should delete all product images', async () => {
      const key = 'products/product-image.jpg';
      await mockR2.put(key, Buffer.from('image'));

      const productData = {
        media: {
          image: `${testPublicUrl}/${key}`,
        },
      };

      await ImageService.deleteProductImages(mockR2, productData, testPublicUrl);

      const remaining = await mockR2.get(key);
      expect(remaining).to.be.null;
    });

    it('should handle products without images', async () => {
      const productData = {
        media: {},
      };

      // Should not throw
      await ImageService.deleteProductImages(mockR2, productData, testPublicUrl);
    });

    it('should handle multiple image deletions', async () => {
      // Note: Current implementation only supports single image
      // This test documents the behavior
      const key = 'products/single-image.jpg';
      await mockR2.put(key, Buffer.from('image'));

      const productData = {
        media: {
          image: `${testPublicUrl}/${key}`,
        },
      };

      await ImageService.deleteProductImages(mockR2, productData, testPublicUrl);

      expect(await mockR2.get(key)).to.be.null;
    });
  });

  describe('Image key format', () => {
    it('should use products/ prefix', async () => {
      const key = await ImageService.uploadImage(mockR2, Buffer.from('test'), 'format-test.jpg');

      expect(key).to.match(/^products\//);
    });

    it('should include timestamp', async () => {
      const beforeTimestamp = Date.now();

      const key = await ImageService.uploadImage(mockR2, Buffer.from('test'), 'timestamp-test.jpg');

      const afterTimestamp = Date.now();

      // Extract timestamp from key (format: products/{timestamp}-{filename})
      const keyParts = key.split('/')[1].split('-');
      const keyTimestamp = parseInt(keyParts[0]);

      expect(keyTimestamp).to.be.at.least(beforeTimestamp);
      expect(keyTimestamp).to.be.at.most(afterTimestamp);
    });
  });
});
