import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from './auth.js';

// Mock the token module
vi.mock('../auth/token.js', () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from '../auth/token.js';

const mockedVerifyToken = vi.mocked(verifyToken);

/** Helper to create a minimal mock Request. */
function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request;
}

/** Helper to create a mock Response with spied methods. */
function mockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('authenticate', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or malformed Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const req = mockRequest({ headers: { authorization: 'Basic abc123' } });
    const res = mockResponse();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or malformed Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = mockRequest({ headers: { authorization: 'Bearer invalid-token' } });
    const res = mockResponse();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches decoded payload to req.user and calls next on valid token', () => {
    const payload = { userId: 'u1', email: 'test@example.com', role: 'admin' };
    mockedVerifyToken.mockReturnValue(payload);

    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockResponse();

    authenticate(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('authorize', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('returns 401 when req.user is not set', () => {
    const req = mockRequest();
    const res = mockResponse();

    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in allowed roles', () => {
    const req = mockRequest();
    req.user = { userId: 'u1', email: 'test@example.com', role: 'ambassador' };
    const res = mockResponse();

    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user role matches a single allowed role', () => {
    const req = mockRequest();
    req.user = { userId: 'u1', email: 'test@example.com', role: 'admin' };
    const res = mockResponse();

    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when user role matches one of multiple allowed roles', () => {
    const req = mockRequest();
    req.user = { userId: 'u1', email: 'test@example.com', role: 'organizer' };
    const res = mockResponse();

    const middleware = authorize('admin', 'organizer');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user role does not match any of multiple allowed roles', () => {
    const req = mockRequest();
    req.user = { userId: 'u1', email: 'test@example.com', role: 'ambassador' };
    const res = mockResponse();

    const middleware = authorize('admin', 'organizer');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });
});
