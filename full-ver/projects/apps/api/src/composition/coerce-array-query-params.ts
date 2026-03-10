/**
 * @what OAS 3.0 array query param coercion at schema level
 * @why Express query parsing collapses single-value arrays to strings,
 *      causing z.array() validation to fail with 422.
 *      This module wraps route query schemas with z.preprocess
 *      so that string values are normalized to [string] before validation.
 *
 * @see https://github.com/your-org/your-repo/issues/708
 */

import { z } from 'zod';

/**
 * Detect whether a Zod schema is an array type, unwrapping optional/nullable wrappers.
 *
 * Handles the pattern for optional array schemas:
 *   z.array(...).exactOptional()
 *
 * `.exactOptional()` creates `{ type: 'optional', innerType: ... }`.
 */
export function isArraySchema(schema: z.ZodType): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)?._zod?.def;
  if (!def) return false;

  if (def.type === 'array') return true;

  // Unwrap optional / nullable wrappers and recurse
  if ((def.type === 'optional' || def.type === 'nullable') && def.innerType) {
    return isArraySchema(def.innerType);
  }

  return false;
}

/**
 * Wrap a query schema's array fields with `z.preprocess(coerceToArray, ...)`.
 *
 * Given a `z.object({ rankIds: z.array(z.uuid()).exactOptional(), q: z.string() })`,
 * returns a `z.preprocess(...)` pipeline that normalizes string → [string] for
 * every field whose underlying type is `array`, then pipes through the original schema.
 */
export function withArrayQueryCoercion(querySchema: z.ZodObject<z.ZodRawShape>): z.ZodType {
  // Collect array field names once at registration time
  const arrayKeys: string[] = [];
  const shape = querySchema.shape;
  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (isArraySchema(fieldSchema as z.ZodType)) {
      arrayKeys.push(key);
    }
  }

  // No array fields → return the schema unmodified (avoid unnecessary ZodPipe wrapper)
  if (arrayKeys.length === 0) return querySchema;

  return z.preprocess((val: unknown) => {
    if (typeof val !== 'object' || val === null) return val;
    const obj = { ...(val as Record<string, unknown>) };
    for (const key of arrayKeys) {
      if (typeof obj[key] === 'string') {
        obj[key] = [obj[key]];
      }
    }
    return obj;
  }, querySchema);
}
