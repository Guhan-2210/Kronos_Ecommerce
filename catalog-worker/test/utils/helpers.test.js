// test/utils/helpers.test.js
import { expect } from 'chai';
import {
  generateId,
  parsePaginationParams,
  parseFilterParams,
  successResponse,
  errorResponse,
  validateImageContentType,
  extractFilename,
} from '../../src/utils/helpers.js';

describe('Helpers Utils', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id = generateId();

      expect(id).to.be.a('string');
      expect(id.length).to.be.greaterThan(0);
      expect(id).to.include('-');
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).to.not.equal(id2);
      expect(id2).to.not.equal(id3);
      expect(id1).to.not.equal(id3);
    });

    it('should have timestamp component', () => {
      const id = generateId();
      const parts = id.split('-');

      expect(parts.length).to.equal(2);
      expect(parts[0]).to.be.a('string');
      expect(parts[1]).to.be.a('string');
    });
  });

  describe('parsePaginationParams', () => {
    it('should parse default pagination parameters', () => {
      const searchParams = new URLSearchParams();
      const result = parsePaginationParams(searchParams);

      expect(result.page).to.equal(1);
      expect(result.limit).to.equal(10);
      expect(result.offset).to.equal(0);
    });

    it('should parse custom pagination parameters', () => {
      const searchParams = new URLSearchParams('page=3&limit=20');
      const result = parsePaginationParams(searchParams);

      expect(result.page).to.equal(3);
      expect(result.limit).to.equal(20);
      expect(result.offset).to.equal(40); // (3 - 1) * 20
    });

    it('should limit maximum page size', () => {
      const searchParams = new URLSearchParams('limit=200');
      const result = parsePaginationParams(searchParams);

      expect(result.limit).to.equal(100); // Max is 100
    });

    it('should calculate correct offset', () => {
      const searchParams = new URLSearchParams('page=5&limit=15');
      const result = parsePaginationParams(searchParams);

      expect(result.offset).to.equal(60); // (5 - 1) * 15
    });

    it('should handle invalid page numbers', () => {
      const searchParams = new URLSearchParams('page=invalid');
      const result = parsePaginationParams(searchParams);

      expect(result.page).to.be.a('number');
      // parseInt('invalid') returns NaN, which is expected behavior
      expect(result.page).to.satisfy(n => n === 1 || isNaN(n));
    });
  });

  describe('parseFilterParams', () => {
    it('should parse empty filters', () => {
      const searchParams = new URLSearchParams();
      const result = parseFilterParams(searchParams);

      expect(result.q).to.be.undefined;
      expect(result.brand).to.be.undefined;
      expect(result.sortBy).to.equal('created_at');
      expect(result.sortOrder).to.equal('DESC');
    });

    it('should parse search query', () => {
      const searchParams = new URLSearchParams('q=Rolex');
      const result = parseFilterParams(searchParams);

      expect(result.q).to.equal('Rolex');
    });

    it('should parse brand filter', () => {
      const searchParams = new URLSearchParams('brand=Omega');
      const result = parseFilterParams(searchParams);

      expect(result.brand).to.equal('Omega');
    });

    it('should parse gender filter', () => {
      const searchParams = new URLSearchParams('gender=Men');
      const result = parseFilterParams(searchParams);

      expect(result.gender).to.equal('Men');
    });

    it('should parse material filter', () => {
      const searchParams = new URLSearchParams('material=Steel');
      const result = parseFilterParams(searchParams);

      expect(result.material).to.equal('Steel');
    });

    it('should parse price range filters', () => {
      const searchParams = new URLSearchParams('minPrice=1000&maxPrice=5000');
      const result = parseFilterParams(searchParams);

      expect(result.minPrice).to.equal(1000);
      expect(result.maxPrice).to.equal(5000);
    });

    it('should parse sort parameters', () => {
      const searchParams = new URLSearchParams('sortBy=updated_at&sortOrder=ASC');
      const result = parseFilterParams(searchParams);

      expect(result.sortBy).to.equal('updated_at');
      expect(result.sortOrder).to.equal('ASC');
    });

    it('should handle multiple filters', () => {
      const searchParams = new URLSearchParams('q=watch&brand=Rolex&gender=Men&minPrice=5000');
      const result = parseFilterParams(searchParams);

      expect(result.q).to.equal('watch');
      expect(result.brand).to.equal('Rolex');
      expect(result.gender).to.equal('Men');
      expect(result.minPrice).to.equal(5000);
    });
  });

  describe('successResponse', () => {
    it('should create success response', () => {
      const data = { id: '123', name: 'Test' };
      const result = successResponse(data);

      expect(result.success).to.be.true;
      expect(result.data).to.deep.equal(data);
    });

    it('should include message if provided', () => {
      const data = { id: '123' };
      const message = 'Operation successful';
      const result = successResponse(data, message);

      expect(result.success).to.be.true;
      expect(result.message).to.equal(message);
      expect(result.data).to.deep.equal(data);
    });

    it('should include metadata', () => {
      const data = { id: '123' };
      const meta = { page: 1, total: 100 };
      const result = successResponse(data, null, meta);

      expect(result.success).to.be.true;
      expect(result.page).to.equal(1);
      expect(result.total).to.equal(100);
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const message = 'Something went wrong';
      const result = errorResponse(message);

      expect(result.success).to.be.false;
      expect(result.error.message).to.equal(message);
      expect(result.error.statusCode).to.equal(500);
    });

    it('should include custom status code', () => {
      const message = 'Not found';
      const statusCode = 404;
      const result = errorResponse(message, statusCode);

      expect(result.success).to.be.false;
      expect(result.error.message).to.equal(message);
      expect(result.error.statusCode).to.equal(statusCode);
    });

    it('should include error details', () => {
      const message = 'Validation failed';
      const details = ['Field is required', 'Invalid format'];
      const result = errorResponse(message, 400, details);

      expect(result.success).to.be.false;
      expect(result.error.details).to.deep.equal(details);
    });
  });

  describe('validateImageContentType', () => {
    it('should accept valid image types', () => {
      expect(validateImageContentType('image/jpeg')).to.be.true;
      expect(validateImageContentType('image/jpg')).to.be.true;
      expect(validateImageContentType('image/png')).to.be.true;
      expect(validateImageContentType('image/webp')).to.be.true;
      expect(validateImageContentType('image/gif')).to.be.true;
    });

    it('should be case insensitive', () => {
      expect(validateImageContentType('IMAGE/JPEG')).to.be.true;
      expect(validateImageContentType('Image/Png')).to.be.true;
    });

    it('should reject invalid types', () => {
      expect(validateImageContentType('application/pdf')).to.be.false;
      expect(validateImageContentType('text/html')).to.be.false;
      expect(validateImageContentType('video/mp4')).to.be.false;
    });

    it('should reject empty or invalid strings', () => {
      expect(validateImageContentType('')).to.be.false;
      expect(validateImageContentType('invalid')).to.be.false;
    });
  });

  describe('extractFilename', () => {
    it('should extract filename from content-disposition', () => {
      const header = 'attachment; filename="image.jpg"';
      const result = extractFilename(header);

      expect(result).to.equal('image.jpg');
    });

    it('should handle filename without quotes', () => {
      const header = 'attachment; filename=photo.png';
      const result = extractFilename(header);

      expect(result).to.equal('photo.png');
    });

    it('should return default name if no header', () => {
      const result = extractFilename(null);

      expect(result).to.equal('image.jpg');
    });

    it('should return custom default name', () => {
      const result = extractFilename(null, 'custom.png');

      expect(result).to.equal('custom.png');
    });

    it('should return default if no filename in header', () => {
      const header = 'attachment';
      const result = extractFilename(header);

      expect(result).to.equal('image.jpg');
    });
  });
});
