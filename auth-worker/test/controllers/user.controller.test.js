import { expect } from 'chai';
import sinon from 'sinon';
import { meCtrl } from '../../src/controllers/user.controller.js';
import * as db from '../../src/models/db.js';
import * as cryptoService from '../../src/services/crypto.service.js';

describe('UserController', () => {
  let mockEnv;
  let mockRequest;
  let dbStub;
  let prepareStub;
  let bindStub;
  let firstStub;
  let decryptFieldStub;

  beforeEach(() => {
    mockEnv = { DB: 'mock-db', DATA_ENC_KEY_B64: 'test-key' };

    firstStub = sinon.stub();
    bindStub = sinon.stub().returns({ first: firstStub });
    prepareStub = sinon.stub().returns({ bind: bindStub });
    dbStub = sinon.stub(db, 'db').returns({ prepare: prepareStub });

    decryptFieldStub = sinon.stub(cryptoService, 'decryptField');

    mockRequest = {
      headers: {
        get: sinon.stub().returns('test-cf-ray'),
      },
      auth: {
        userId: 'user-123',
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('meCtrl', () => {
    it('should return user data', async () => {
      const userData = {
        name: 'encrypted-name',
        email: 'encrypted-email',
        phone: 'encrypted-phone',
        address: JSON.stringify({ city: 'encrypted' }),
      };

      firstStub.resolves({
        id: 'user-123',
        user_data: JSON.stringify(userData),
      });

      decryptFieldStub.withArgs(mockEnv, 'encrypted-name').resolves('John Doe');
      decryptFieldStub.withArgs(mockEnv, 'encrypted-email').resolves('john@example.com');
      decryptFieldStub.withArgs(mockEnv, 'encrypted-phone').resolves('+1234567890');
      decryptFieldStub
        .withArgs(mockEnv, JSON.stringify({ city: 'encrypted' }))
        .resolves(JSON.stringify({ city: 'New York' }));

      const response = await meCtrl(mockRequest, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(200);
      expect(body.user).to.exist;
      expect(body.user.name).to.equal('John Doe');
      expect(body.user.email).to.equal('john@example.com');
    });

    it('should return 404 when user not found', async () => {
      firstStub.resolves(null);

      const response = await meCtrl(mockRequest, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(404);
      expect(body.error).to.equal('NotFound');
    });

    it('should return 500 on error', async () => {
      firstStub.rejects(new Error('Database error'));

      const response = await meCtrl(mockRequest, mockEnv);
      const body = JSON.parse(await response.text());

      expect(response.status).to.equal(500);
      expect(body.error).to.equal('Failed');
    });

    it('should decrypt all PII fields', async () => {
      const userData = {
        name: 'enc-name',
        email: 'enc-email',
        phone: 'enc-phone',
        address: JSON.stringify({ street: 'Main' }),
      };

      firstStub.resolves({
        id: 'user-456',
        user_data: JSON.stringify(userData),
      });

      decryptFieldStub.resolves('decrypted');

      await meCtrl(mockRequest, mockEnv);

      expect(decryptFieldStub.callCount).to.equal(4); // name, email, phone, address
    });
  });
});
