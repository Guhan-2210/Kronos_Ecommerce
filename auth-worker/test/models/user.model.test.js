import { expect } from 'chai';
import * as UserModel from '../../src/models/user.model.js';
import { createMockEnv } from '../helpers/mock-env.js';

describe('UserModel', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockEnv.DB._reset();
  });

  describe('insertUser', () => {
    it('should insert a new user', async () => {
      const userId = 'user-123';
      const userData = {
        email_hash: 'hash123',
        password_hash: 'pass123',
        name: 'Test User',
      };

      await UserModel.insertUser(mockEnv, userId, userData);

      // Verify user was inserted by retrieving by email hash
      const result = await UserModel.findUserByEmailHash(mockEnv, 'hash123');
      expect(result).to.not.be.null;
      expect(result.id).to.equal(userId);
      expect(result.user_data.email_hash).to.equal('hash123');
    });

    it('should stringify user data before inserting', async () => {
      const userData = { email_hash: 'test', name: 'Test User' };

      await UserModel.insertUser(mockEnv, 'user-456', userData);

      // Retrieve and verify the data was stored correctly
      const result = await UserModel.findUserByEmailHash(mockEnv, 'test');
      expect(result).to.not.be.null;
      expect(result.user_data).to.be.an('object');
      expect(result.user_data.name).to.equal('Test User');
    });
  });

  describe('findUserByEmailHash', () => {
    it('should find user by email hash', async () => {
      const userData = { email_hash: 'hash123', name: 'John' };
      await UserModel.insertUser(mockEnv, 'user-123', userData);

      const result = await UserModel.findUserByEmailHash(mockEnv, 'hash123');

      expect(result).to.not.be.null;
      expect(result.id).to.equal('user-123');
      expect(result.user_data).to.deep.equal(userData);
    });

    it('should return null when user not found', async () => {
      const result = await UserModel.findUserByEmailHash(mockEnv, 'nonexistent');

      expect(result).to.be.null;
    });

    it('should parse user_data JSON', async () => {
      const userData = { email_hash: 'test', password_hash: 'hashed' };
      await UserModel.insertUser(mockEnv, 'user-789', userData);

      const result = await UserModel.findUserByEmailHash(mockEnv, 'test');

      expect(result.user_data).to.be.an('object');
      expect(result.user_data.email_hash).to.equal('test');
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const userId = 'user-123';
      const initialData = { email_hash: 'oldhash', name: 'John' };
      await UserModel.insertUser(mockEnv, userId, initialData);

      const newData = { email_hash: 'newhash', name: 'John', updated: true };
      await UserModel.updateUser(mockEnv, userId, newData);

      // Note: Since we can't easily retrieve by ID with our mock,
      // we'll verify by email hash
      const result = await UserModel.findUserByEmailHash(mockEnv, 'newhash');
      expect(result).to.not.be.null;
      expect(result.user_data.updated).to.equal(true);
    });

    it('should stringify new user data', async () => {
      const userId = 'user-456';
      const initialData = { email_hash: 'hash456', field: 'old' };
      await UserModel.insertUser(mockEnv, userId, initialData);

      const newData = { email_hash: 'hash456', field: 'value', another: 123 };
      await UserModel.updateUser(mockEnv, userId, newData);

      const result = await UserModel.findUserByEmailHash(mockEnv, 'hash456');
      expect(result.user_data.field).to.equal('value');
      expect(result.user_data.another).to.equal(123);
    });
  });
});
