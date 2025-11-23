import { expect } from 'chai';
import sinon from 'sinon';
import * as UserModel from '../../src/models/user.model.js';
import * as db from '../../src/models/db.js';

describe('UserModel', () => {
  let mockEnv;
  let prepareStub;
  let bindStub;
  let runStub;
  let firstStub;
  let dbStub;

  beforeEach(() => {
    mockEnv = { DB: 'mock-db' };

    runStub = sinon.stub().resolves({ success: true });
    firstStub = sinon.stub();
    bindStub = sinon.stub().returns({
      run: runStub,
      first: firstStub,
    });
    prepareStub = sinon.stub().returns({
      bind: bindStub,
    });

    dbStub = sinon.stub(db, 'db').returns({
      prepare: prepareStub,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('insertUser', () => {
    it('should insert a new user', async () => {
      const userId = 'user-123';
      const userData = {
        email_hash: 'hash123',
        password_hash: 'pass123',
      };

      await UserModel.insertUser(mockEnv, userId, userData);

      expect(prepareStub).to.have.been.calledOnce;
      expect(bindStub).to.have.been.calledWith(userId, JSON.stringify(userData));
      expect(runStub).to.have.been.calledOnce;
    });

    it('should stringify user data before inserting', async () => {
      const userData = { email_hash: 'test', name: 'Test User' };

      await UserModel.insertUser(mockEnv, 'user-456', userData);

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[1]).to.equal(JSON.stringify(userData));
    });
  });

  describe('findUserByEmailHash', () => {
    it('should find user by email hash', async () => {
      const userData = { email_hash: 'hash123', name: 'John' };
      firstStub.resolves({
        id: 'user-123',
        user_data: JSON.stringify(userData),
      });

      const result = await UserModel.findUserByEmailHash(mockEnv, 'hash123');

      expect(result).to.not.be.null;
      expect(result.id).to.equal('user-123');
      expect(result.user_data).to.deep.equal(userData);
      expect(bindStub).to.have.been.calledWith('hash123');
    });

    it('should return null when user not found', async () => {
      firstStub.resolves(null);

      const result = await UserModel.findUserByEmailHash(mockEnv, 'nonexistent');

      expect(result).to.be.null;
    });

    it('should parse user_data JSON', async () => {
      const userData = { email_hash: 'test', password_hash: 'hashed' };
      firstStub.resolves({
        id: 'user-789',
        user_data: JSON.stringify(userData),
      });

      const result = await UserModel.findUserByEmailHash(mockEnv, 'test');

      expect(result.user_data).to.be.an('object');
      expect(result.user_data.email_hash).to.equal('test');
    });

    it('should use json_extract for email_hash query', async () => {
      firstStub.resolves(null);

      await UserModel.findUserByEmailHash(mockEnv, 'hash');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include("json_extract(user_data, '$.email_hash')");
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const userId = 'user-123';
      const newData = { email_hash: 'newhash', updated: true };

      await UserModel.updateUser(mockEnv, userId, newData);

      expect(prepareStub).to.have.been.calledOnce;
      expect(bindStub).to.have.been.calledWith(JSON.stringify(newData), userId);
      expect(runStub).to.have.been.calledOnce;
    });

    it('should stringify new user data', async () => {
      const newData = { field: 'value', another: 123 };

      await UserModel.updateUser(mockEnv, 'user-456', newData);

      const bindArgs = bindStub.firstCall.args;
      expect(bindArgs[0]).to.equal(JSON.stringify(newData));
    });

    it('should update updated_at timestamp', async () => {
      await UserModel.updateUser(mockEnv, 'user-789', { data: 'test' });

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include("updated_at = datetime('now')");
    });
  });
});
