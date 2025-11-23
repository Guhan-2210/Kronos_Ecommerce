import { expect } from 'chai';
import { signupSchema, loginSchema, refreshSchema } from '../../src/schemas/auth.schemas.js';

describe('Auth Schemas', () => {
  describe('signupSchema', () => {
    it('should validate valid signup data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: {
          line1: '123 Main St',
          line2: '',
          street: 'Main Street',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'USA',
        },
      };

      const { error, value } = signupSchema.validate(validData);
      expect(error).to.be.undefined;
      expect(value).to.deep.equal(validData);
    });

    it('should require name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        phone: '1234567890',
        address: {
          line1: '123 St',
          line2: '',
          street: 'Street',
          city: 'City',
          state: 'ST',
          postal_code: '12345',
          country: 'US',
        },
      };

      const { error } = signupSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('name');
    });

    it('should require valid email', () => {
      const invalidData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        phone: '1234567890',
        address: {
          line1: '123 St',
          line2: '',
          street: 'Street',
          city: 'City',
          state: 'ST',
          postal_code: '12345',
          country: 'US',
        },
      };

      const { error } = signupSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('email');
    });

    it('should require password with minimum length', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'short',
        phone: '1234567890',
        address: {
          line1: '123 St',
          line2: '',
          street: 'Street',
          city: 'City',
          state: 'ST',
          postal_code: '12345',
          country: 'US',
        },
      };

      const { error } = signupSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('password');
      expect(error.details[0].message).to.include('8');
    });

    it('should require address object', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '1234567890',
      };

      const { error } = signupSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('address');
    });

    it('should allow empty line2 in address', () => {
      const validData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securepass123',
        phone: '9876543210',
        address: {
          line1: '456 Oak Ave',
          line2: '',
          street: 'Oak Avenue',
          city: 'Boston',
          state: 'MA',
          postal_code: '02101',
          country: 'USA',
        },
      };

      const { error } = signupSchema.validate(validData);
      expect(error).to.be.undefined;
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'mypassword',
      };

      const { error, value } = loginSchema.validate(validData);
      expect(error).to.be.undefined;
      expect(value).to.deep.equal(validData);
    });

    it('should require email', () => {
      const invalidData = {
        password: 'password123',
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('email');
    });

    it('should require valid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('email');
    });

    it('should require password', () => {
      const invalidData = {
        email: 'user@example.com',
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('password');
    });
  });

  describe('refreshSchema', () => {
    it('should validate valid refresh data', () => {
      const validData = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const { error, value } = refreshSchema.validate(validData);
      expect(error).to.be.undefined;
      expect(value).to.deep.equal(validData);
    });

    it('should require session_id', () => {
      const invalidData = {};

      const { error } = refreshSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('session_id');
    });

    it('should require valid UUID format', () => {
      const invalidData = {
        session_id: 'not-a-uuid',
      };

      const { error } = refreshSchema.validate(invalidData);
      expect(error).to.exist;
      expect(error.details[0].message).to.include('GUID');
    });
  });
});
