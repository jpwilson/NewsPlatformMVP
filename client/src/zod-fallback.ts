/**
 * This is a fallback module for zod to ensure it's properly included in the Vercel build
 * with TypeScript support
 */
import * as z from 'zod';

// Re-export specific types and functions
export const object = z.object;
export const string = z.string;
export const number = z.number;
export const boolean = z.boolean;
export const array = z.array;

// Re-export the infer type
export type infer<T extends z.ZodTypeAny> = z.infer<T>;

// Re-export everything else
export * from 'zod';

// Default export
export default z; 