// This file is a special bundling wrapper for zod to work around Vercel build issues
import * as z from 'zod';

// Re-export everything from zod
export const object = z.object;
export const string = z.string;
export const number = z.number;
export const boolean = z.boolean;
export const array = z.array;
export const infer = z.infer;

// Export all other zod functions
export * from 'zod';
export default z; 