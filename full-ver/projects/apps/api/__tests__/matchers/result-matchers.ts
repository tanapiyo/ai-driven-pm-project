/**
 * @what Custom Vitest matchers for Result type
 * @why Improve test readability for Result-based assertions
 */

import { expect } from 'vitest';
import type { Result } from '@monorepo/shared';

interface CustomMatchers<R = unknown> {
  toBeSuccess(): R;
  toBeFailure(expectedError?: unknown): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  /**
   * Assert that a Result is Success
   * @example
   * expect(result).toBeSuccess()
   */
  toBeSuccess<T>(result: Result<T, unknown>) {
    const pass = result.isSuccess();

    if (pass) {
      return {
        pass: true,
        message: () => 'Expected Result to be Failure but was Success',
      };
    } else {
      return {
        pass: false,
        message: () =>
          `Expected Result to be Success but was Failure: ${JSON.stringify(result.error)}`,
      };
    }
  },

  /**
   * Assert that a Result is Failure, optionally with specific error
   * @example
   * expect(result).toBeFailure()
   * expect(result).toBeFailure('invalid_name')
   */
  toBeFailure<E>(result: Result<unknown, E>, expectedError?: E) {
    const isFailure = result.isFailure();
    const errorMatches =
      expectedError === undefined || (isFailure && result.error === expectedError);

    const pass = isFailure && errorMatches;

    if (pass) {
      return {
        pass: true,
        message: () => 'Expected Result to be Success but was Failure',
      };
    } else {
      if (!isFailure) {
        return {
          pass: false,
          message: () => 'Expected Result to be Failure but was Success',
        };
      } else {
        return {
          pass: false,
          message: () => `Expected error "${expectedError}" but got "${result.error}"`,
        };
      }
    }
  },
});
