/**
 * Image service for R2 storage
 */

export const ImageService = {
  /**
   * Upload image to R2
   */
  async uploadImage(r2, imageBuffer, filename, contentType = 'image/jpeg') {
    try {
      const key = `products/${Date.now()}-${filename}`;

      await r2.put(key, imageBuffer, {
        httpMetadata: {
          contentType,
        },
      });

      return key;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  },

  /**
   * Get public URL for R2 object
   */
  getPublicUrl(r2PublicUrl, key) {
    return `${r2PublicUrl}/${key}`;
  },

  /**
   * Delete image from R2
   */
  async deleteImage(r2, key) {
    try {
      await r2.delete(key);
      return true;
    } catch (error) {
      console.error(`Failed to delete image: ${error.message}`);
      return false;
    }
  },

  /**
   * Get image from R2
   */
  async getImage(r2, key) {
    try {
      const object = await r2.get(key);
      if (!object) {
        return null;
      }

      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType || 'image/jpeg',
      };
    } catch (error) {
      console.error(`Failed to get image: ${error.message}`);
      return null;
    }
  },

  /**
   * Extract old image keys from product data
   */
  extractImageKeys(productData, r2PublicUrl) {
    const keys = [];

    if (productData.media?.image) {
      const url = productData.media.image;
      if (url.startsWith(r2PublicUrl)) {
        const key = url.replace(`${r2PublicUrl}/`, '');
        keys.push(key);
      }
    }

    return keys;
  },

  /**
   * Delete old images from product
   */
  async deleteProductImages(r2, productData, r2PublicUrl) {
    const keys = this.extractImageKeys(productData, r2PublicUrl);

    for (const key of keys) {
      await this.deleteImage(r2, key);
    }
  },
};
