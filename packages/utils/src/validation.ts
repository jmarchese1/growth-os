import { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Parse and validate data with a Zod schema, throwing a typed ValidationError on failure.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!fields[path]) fields[path] = [];
      fields[path]!.push(issue.message);
    }
    throw new ValidationError('Validation failed', fields);
  }

  return result.data;
}

// Common reusable Zod schemas
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number in E.164 format');

export const emailSchema = z.string().email('Must be a valid email address');

export const cuidSchema = z.string().cuid('Must be a valid ID');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
