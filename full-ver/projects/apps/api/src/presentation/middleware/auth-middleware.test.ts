/**
 * @what 認証ミドルウェアのユニットテスト
 * @why セキュリティクリティカルなリクエスト認証の正確性を保証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Result } from '@monorepo/shared';
import { AuthMiddleware } from './auth-middleware.js';
import type { JwtService, JwtPayload } from '@/infrastructure/index.js';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let mockJwtService: JwtService;
  let mockReq: Partial<IncomingMessage>;
  let mockRes: Partial<ServerResponse>;

  const validPayload: JwtPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'user',
    iat: 1234567890,
    exp: 1234568790,
  };

  beforeEach(() => {
    mockJwtService = {
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
      generateTokenPair: vi.fn(),
      generateAccessToken: vi.fn(),
    } as unknown as JwtService;

    middleware = new AuthMiddleware(mockJwtService);

    mockReq = {
      headers: {},
    };

    mockRes = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
  });

  describe('authenticate', () => {
    describe('valid authentication', () => {
      it('should authenticate valid bearer token', () => {
        mockReq.headers = {
          authorization: 'Bearer valid-token-123',
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(validPayload));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(true);
        if (result.authenticated) {
          expect(result.user.userId).toBe(validPayload.sub);
          expect(result.user.email).toBe(validPayload.email);
          expect(result.user.role).toBe(validPayload.role);
        }
        expect(mockJwtService.verifyAccessToken).toHaveBeenCalledWith('valid-token-123');
      });

      it('should authenticate with admin role', () => {
        mockReq.headers = {
          authorization: 'Bearer admin-token',
        };
        const adminPayload: JwtPayload = { ...validPayload, role: 'admin' };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(adminPayload));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(true);
        if (result.authenticated) {
          expect(result.user.role).toBe('admin');
        }
      });

      it('should authenticate with user role', () => {
        mockReq.headers = {
          authorization: 'Bearer user-token',
        };
        const userPayload: JwtPayload = { ...validPayload, role: 'user' };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(userPayload));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(true);
        if (result.authenticated) {
          expect(result.user.role).toBe('user');
        }
      });

      it('should handle token with extra whitespace after Bearer', () => {
        mockReq.headers = {
          authorization: 'Bearer  valid-token-123', // Double space
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(validPayload));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(true);
        expect(mockJwtService.verifyAccessToken).toHaveBeenCalledWith(' valid-token-123');
      });
    });

    describe('missing authorization header', () => {
      it('should fail when authorization header is missing', () => {
        mockReq.headers = {};

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('missing_token');
        }
        expect(mockJwtService.verifyAccessToken).not.toHaveBeenCalled();
      });

      it('should fail when authorization header is empty', () => {
        mockReq.headers = {
          authorization: '',
        };

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('missing_token');
        }
      });

      it('should fail when authorization header is undefined', () => {
        mockReq.headers = {
          authorization: undefined,
        };

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('missing_token');
        }
      });
    });

    describe('invalid bearer token format', () => {
      it('should fail when token does not start with Bearer', () => {
        mockReq.headers = {
          authorization: 'InvalidPrefix token-123',
        };

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('missing_token');
        }
        expect(mockJwtService.verifyAccessToken).not.toHaveBeenCalled();
      });

      it('should fail when token is just "Bearer" without token', () => {
        mockReq.headers = {
          authorization: 'Bearer',
        };

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('missing_token');
        }
      });

      it('should fail with lowercase bearer', () => {
        mockReq.headers = {
          authorization: 'bearer token-123',
        };

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('missing_token');
        }
      });

      it('should fail when token is only whitespace after Bearer', () => {
        mockReq.headers = {
          authorization: 'Bearer   ',
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.fail('invalid_token'));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('invalid_token');
        }
      });
    });

    describe('invalid token verification', () => {
      it('should fail when JWT verification fails', () => {
        mockReq.headers = {
          authorization: 'Bearer invalid-token',
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.fail('invalid_token'));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('invalid_token');
        }
      });

      it('should return token_expired when token is expired', () => {
        mockReq.headers = {
          authorization: 'Bearer expired-token',
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.fail('token_expired'));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('token_expired');
        }
      });

      it('should return invalid_token for malformed token', () => {
        mockReq.headers = {
          authorization: 'Bearer malformed.token.here',
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.fail('invalid_token'));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(false);
        if (!result.authenticated) {
          expect(result.error).toBe('invalid_token');
        }
      });
    });

    describe('edge cases', () => {
      it('should handle very long token', () => {
        const longToken = 'a'.repeat(10000);
        mockReq.headers = {
          authorization: `Bearer ${longToken}`,
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(validPayload));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(true);
        expect(mockJwtService.verifyAccessToken).toHaveBeenCalledWith(longToken);
      });

      it('should handle token with special characters', () => {
        const tokenWithSpecialChars = 'token-with-!@#$%^&*()';
        mockReq.headers = {
          authorization: `Bearer ${tokenWithSpecialChars}`,
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(validPayload));

        const result = middleware.authenticate(mockReq as IncomingMessage);

        expect(result.authenticated).toBe(true);
        expect(mockJwtService.verifyAccessToken).toHaveBeenCalledWith(tokenWithSpecialChars);
      });

      it('should extract correct token when Bearer has exact one space', () => {
        mockReq.headers = {
          authorization: 'Bearer token123',
        };
        vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.ok(validPayload));

        middleware.authenticate(mockReq as IncomingMessage);

        expect(mockJwtService.verifyAccessToken).toHaveBeenCalledWith('token123');
      });
    });
  });

  describe('sendUnauthorized', () => {
    it('should send 401 response for missing_token', () => {
      middleware.sendUnauthorized(mockRes as ServerResponse, 'missing_token');

      expect(mockRes.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Authorization header required',
        })
      );
    });

    it('should send 401 response for invalid_token', () => {
      middleware.sendUnauthorized(mockRes as ServerResponse, 'invalid_token');

      expect(mockRes.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Invalid access token',
        })
      );
    });

    it('should send 401 response for token_expired', () => {
      middleware.sendUnauthorized(mockRes as ServerResponse, 'token_expired');

      expect(mockRes.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          code: 'UNAUTHORIZED',
          message: 'Access token expired',
        })
      );
    });

    it('should set correct content-type header', () => {
      middleware.sendUnauthorized(mockRes as ServerResponse, 'missing_token');

      expect(mockRes.writeHead).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ 'Content-Type': 'application/json' })
      );
    });

    it('should return valid JSON in response body', () => {
      middleware.sendUnauthorized(mockRes as ServerResponse, 'invalid_token');

      const endCall = vi.mocked(mockRes.end!).mock.calls[0][0] as string;
      expect(() => JSON.parse(endCall)).not.toThrow();

      const parsed = JSON.parse(endCall);
      expect(parsed).toHaveProperty('code');
      expect(parsed).toHaveProperty('message');
    });
  });

  describe('integration: authenticate and sendUnauthorized', () => {
    it('should complete full rejection flow for missing token', () => {
      mockReq.headers = {};

      const _authResult = middleware.authenticate(mockReq as IncomingMessage);
      expect(_authResult.authenticated).toBe(false);

      if (!_authResult.authenticated) {
        middleware.sendUnauthorized(mockRes as ServerResponse, _authResult.error);
      }

      expect(mockRes.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should complete full rejection flow for invalid token', () => {
      mockReq.headers = {
        authorization: 'Bearer invalid',
      };
      vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.fail('invalid_token'));

      const authResult = middleware.authenticate(mockReq as IncomingMessage);
      expect(authResult.authenticated).toBe(false);

      if (!authResult.authenticated) {
        middleware.sendUnauthorized(mockRes as ServerResponse, authResult.error);
      }

      expect(mockRes.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
      const endCall = vi.mocked(mockRes.end!).mock.calls[0][0] as string;
      const parsed = JSON.parse(endCall);
      expect(parsed.message).toBe('Invalid access token');
    });

    it('should complete full rejection flow for expired token', () => {
      mockReq.headers = {
        authorization: 'Bearer expired',
      };
      vi.mocked(mockJwtService.verifyAccessToken).mockReturnValue(Result.fail('token_expired'));

      const authResult = middleware.authenticate(mockReq as IncomingMessage);
      expect(authResult.authenticated).toBe(false);

      if (!authResult.authenticated) {
        middleware.sendUnauthorized(mockRes as ServerResponse, authResult.error);
      }

      const endCall = vi.mocked(mockRes.end!).mock.calls[0][0] as string;
      const parsed = JSON.parse(endCall);
      expect(parsed.message).toBe('Access token expired');
    });
  });
});
