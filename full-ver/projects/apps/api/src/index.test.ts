import { describe, it, expect } from 'vitest';
import { greet } from './legacy.js';
import { Result } from '@monorepo/shared';

describe('greet', () => {
  it('should return greeting message', () => {
    expect(greet('World')).toBe('Hello, World!');
  });

  it('should handle custom name', () => {
    expect(greet('Test')).toBe('Hello, Test!');
  });
});

describe('Result', () => {
  it('should create success result', () => {
    const result = Result.ok('value');
    expect(result.isSuccess()).toBe(true);
    expect(result.value).toBe('value');
  });

  it('should create failure result', () => {
    const result = Result.fail<string, string>('error');
    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('error');
  });

  it('should map success result', () => {
    const result = Result.ok(5).map((x: number) => x * 2);
    expect(result.value).toBe(10);
  });

  it('should not map failure result', () => {
    const result = Result.fail<number, string>('error').map((x: number) => x * 2);
    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('error');
  });
});
