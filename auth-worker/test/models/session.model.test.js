import { expect } from 'chai';
import sinon from 'sinon';
import * as SessionModel from '../../src/models/session.model.js';
import * as db from '../../src/models/db.js';

describe('SessionModel', () => {
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

  describe('createSession', () => {
    it('should create a new session', async () => {
      const sessionId = 'sess-123';
      const userId = 'user-456';
      const hash = 'token-hash';
      const ttlDays = 30;

      await SessionModel.createSession(mockEnv, sessionId, userId, hash, ttlDays);

      expect(prepareStub).to.have.been.calledOnce;
      expect(bindStub).to.have.been.calledWith(sessionId, userId, hash, ttlDays);
      expect(runStub).to.have.been.calledOnce;
    });

    it('should set expiration date based on TTL', async () => {
      await SessionModel.createSession(mockEnv, 'sess-1', 'user-1', 'hash', 7);

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include("datetime('now', ? || ' days')");
      expect(bindStub).to.have.been.calledWith('sess-1', 'user-1', 'hash', 7);
    });
  });

  describe('getSession', () => {
    it('should retrieve a session by ID', async () => {
      const sessionData = {
        id: 'sess-123',
        user_id: 'user-456',
        refresh_token_hash: 'hash',
        expires_at: '2025-12-31',
        revoked_at: null,
      };

      firstStub.resolves(sessionData);

      const result = await SessionModel.getSession(mockEnv, 'sess-123');

      expect(result).to.deep.equal(sessionData);
      expect(bindStub).to.have.been.calledWith('sess-123');
    });

    it('should return null when session not found', async () => {
      firstStub.resolves(null);

      const result = await SessionModel.getSession(mockEnv, 'nonexistent');

      expect(result).to.be.null;
    });

    it('should return null for undefined result', async () => {
      firstStub.resolves(undefined);

      const result = await SessionModel.getSession(mockEnv, 'test');

      expect(result).to.be.null;
    });
  });

  describe('rotateSessionToken', () => {
    it('should update session with new token hash', async () => {
      const sessionId = 'sess-123';
      const newHash = 'new-hash-value';

      await SessionModel.rotateSessionToken(mockEnv, sessionId, newHash);

      expect(prepareStub).to.have.been.calledOnce;
      expect(bindStub).to.have.been.calledWith(newHash, sessionId);
      expect(runStub).to.have.been.calledOnce;
    });

    it('should only rotate valid sessions', async () => {
      await SessionModel.rotateSessionToken(mockEnv, 'sess-456', 'hash');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include('revoked_at IS NULL');
      expect(sql).to.include("expires_at > datetime('now')");
    });

    it('should update created_at timestamp', async () => {
      await SessionModel.rotateSessionToken(mockEnv, 'sess-789', 'newhash');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include("created_at = datetime('now')");
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      const sessionId = 'sess-123';

      await SessionModel.revokeSession(mockEnv, sessionId);

      expect(prepareStub).to.have.been.calledOnce;
      expect(bindStub).to.have.been.calledWith(sessionId);
      expect(runStub).to.have.been.calledOnce;
    });

    it('should set revoked_at timestamp', async () => {
      await SessionModel.revokeSession(mockEnv, 'sess-456');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include("revoked_at = datetime('now')");
    });

    it('should only revoke non-revoked sessions', async () => {
      await SessionModel.revokeSession(mockEnv, 'sess-789');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include('revoked_at IS NULL');
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const userId = 'user-123';

      await SessionModel.revokeAllSessions(mockEnv, userId);

      expect(prepareStub).to.have.been.calledOnce;
      expect(bindStub).to.have.been.calledWith(userId);
      expect(runStub).to.have.been.calledOnce;
    });

    it('should only revoke active sessions', async () => {
      await SessionModel.revokeAllSessions(mockEnv, 'user-456');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include('revoked_at IS NULL');
      expect(sql).to.include('user_id = ?');
    });

    it('should set revoked_at for all matching sessions', async () => {
      await SessionModel.revokeAllSessions(mockEnv, 'user-789');

      const sql = prepareStub.firstCall.args[0];
      expect(sql).to.include("revoked_at = datetime('now')");
    });
  });
});
