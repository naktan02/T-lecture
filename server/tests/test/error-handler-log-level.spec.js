const assert = require('node:assert/strict');
const { getApiErrorLogLevel } = require('../../src/common/middlewares/errorHandler');

describe('getApiErrorLogLevel', () => {
  it('downgrades expired access tokens to debug', () => {
    assert.equal(
      getApiErrorLogLevel('/api/v1/users/me', {
        statusCode: 401,
        code: 'TOKEN_EXPIRED',
      }),
      'debug',
    );
  });

  it('keeps other auth failures at warn', () => {
    assert.equal(
      getApiErrorLogLevel('/api/v1/users/me', {
        statusCode: 401,
        code: 'INVALID_TOKEN',
      }),
      'warn',
    );
  });

  it('keeps refresh failures at debug', () => {
    assert.equal(
      getApiErrorLogLevel('/api/v1/auth/refresh', {
        statusCode: 401,
        code: 'TOKEN_INVALID',
      }),
      'debug',
    );
  });

  it('keeps server failures at error', () => {
    assert.equal(
      getApiErrorLogLevel('/api/v1/users/me', {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      }),
      'error',
    );
  });
});
