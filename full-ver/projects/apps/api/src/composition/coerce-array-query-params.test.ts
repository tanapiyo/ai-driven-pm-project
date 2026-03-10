/**
 * @what coerce-array-query-params unit tests
 * @why Verify that OAS array query param coercion correctly normalizes
 *      single string values to arrays before Zod validation.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { isArraySchema, withArrayQueryCoercion } from './coerce-array-query-params.js';

describe('isArraySchema', () => {
  it('should return true for z.array()', () => {
    expect(isArraySchema(z.array(z.string()))).toBe(true);
  });

  it('should return false for z.string()', () => {
    expect(isArraySchema(z.string())).toBe(false);
  });

  it('should return true for z.array().optional()', () => {
    expect(isArraySchema(z.array(z.string()).optional())).toBe(true);
  });

  it('should return true for z.array().exactOptional()', () => {
    expect(isArraySchema(z.array(z.string()).exactOptional())).toBe(true);
  });

  it('should return false for z.number()', () => {
    expect(isArraySchema(z.number())).toBe(false);
  });

  it('should return false for z.string().optional()', () => {
    expect(isArraySchema(z.string().optional())).toBe(false);
  });

  it('should return true for z.array().nullable()', () => {
    expect(isArraySchema(z.array(z.string()).nullable())).toBe(true);
  });
});

describe('withArrayQueryCoercion', () => {
  const querySchema = z.object({
    q: z.string().optional(),
    rankIds: z.array(z.string().uuid()).exactOptional(),
    genders: z.array(z.enum(['MALE', 'FEMALE'])).exactOptional(),
    page: z.coerce.number().int().min(1).default(1),
  });
  type QueryData = z.infer<typeof querySchema>;

  it('should coerce a single string to an array for array fields', () => {
    const coerced = withArrayQueryCoercion(querySchema);
    const result = coerced.safeParse({
      rankIds: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryData;
      expect(data.rankIds).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
    }
  });

  it('should pass arrays through unchanged', () => {
    const coerced = withArrayQueryCoercion(querySchema);
    const ids = ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000'];
    const result = coerced.safeParse({ rankIds: ids });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryData;
      expect(data.rankIds).toEqual(ids);
    }
  });

  it('should not modify non-array fields', () => {
    const coerced = withArrayQueryCoercion(querySchema);
    const result = coerced.safeParse({ q: 'search term' });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryData;
      expect(data.q).toBe('search term');
    }
  });

  it('should leave undefined values as undefined', () => {
    const coerced = withArrayQueryCoercion(querySchema);
    const result = coerced.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryData;
      expect(data.rankIds).toBeUndefined();
      expect(data.genders).toBeUndefined();
    }
  });

  it('should coerce multiple array fields simultaneously', () => {
    const coerced = withArrayQueryCoercion(querySchema);
    const result = coerced.safeParse({
      rankIds: '550e8400-e29b-41d4-a716-446655440000',
      genders: 'MALE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as QueryData;
      expect(data.rankIds).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
      expect(data.genders).toEqual(['MALE']);
    }
  });

  it('should still reject invalid values after coercion', () => {
    const coerced = withArrayQueryCoercion(querySchema);
    const result = coerced.safeParse({ rankIds: 'not-a-uuid' });

    expect(result.success).toBe(false);
  });

  it('should return original schema when no array fields exist', () => {
    const noArraySchema = z.object({
      q: z.string().optional(),
      page: z.number().optional(),
    });
    const coerced = withArrayQueryCoercion(noArraySchema);

    // Should be the exact same schema reference (no wrapping)
    expect(coerced).toBe(noArraySchema);
  });
});
