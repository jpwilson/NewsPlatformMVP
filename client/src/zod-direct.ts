/**
 * Minimal direct implementation of zod functionality we need
 * This avoids module resolution issues in Vercel
 */

// Define types for our schemas
export type StringSchema = {
  _type: 'string';
  _min?: number;
  _message?: string;
  min(length: number, msg?: string): StringSchema;
  validate(val: any): boolean | string;
};

export type NumberSchema = {
  _type: 'number';
  validate(val: any): boolean;
};

export type BooleanSchema = {
  _type: 'boolean';
  validate(val: any): boolean;
};

export type ObjectSchema<T = any> = {
  _type: 'object';
  _shape: Record<string, any>;
  validate(val: any): boolean | { _errors: Record<string, any> };
};

export type ArraySchema<T = any> = {
  _type: 'array';
  _schema: any;
  validate(val: any): boolean;
};

// Basic primitive schemas
export const string = (): StringSchema => {
  let minLength = 0;
  let message = "";
  
  const schema: any = {
    min: (length: number, msg?: string) => {
      minLength = length;
      message = msg || `Must be at least ${length} characters`;
      schema._min = minLength;
      schema._message = message;
      return schema;
    },
    _type: 'string',
    _min: minLength,
    _message: message,
    validate: (val: any) => {
      if (typeof val !== 'string') return false;
      if (minLength > 0 && val.length < minLength) return message;
      return true;
    }
  };
  
  return schema;
};

export const number = (): NumberSchema => ({
  _type: 'number',
  validate: (val: any) => typeof val === 'number'
});

export const boolean = (): BooleanSchema => ({
  _type: 'boolean',
  validate: (val: any) => typeof val === 'boolean'
});

// Object schema builder
export const object = (shape: Record<string, any>): ObjectSchema => {
  return {
    _type: 'object',
    _shape: shape,
    validate: (obj: any) => {
      if (!obj || typeof obj !== 'object') return false;
      
      const results: Record<string, any> = {};
      let isValid = true;
      
      for (const [key, schema] of Object.entries(shape)) {
        const value = obj[key];
        const result = schema.validate(value);
        
        if (result !== true) {
          results[key] = { _errors: [typeof result === 'string' ? result : 'Invalid value'] };
          isValid = false;
        }
      }
      
      return isValid ? true : { _errors: results };
    }
  };
};

export const array = (schema: any): ArraySchema => ({
  _type: 'array',
  _schema: schema,
  validate: (val: any) => Array.isArray(val)
});

// Helper for type inference - used with TypeScript
export type infer<T> = 
  T extends { _type: 'string' } ? string :
  T extends { _type: 'number' } ? number :
  T extends { _type: 'boolean' } ? boolean :
  T extends { _type: 'array' } ? any[] :
  T extends { _type: 'object' } ? Record<string, any> :
  any;

// Default export to maintain compatibility
export default {
  string,
  number,
  boolean,
  object,
  array
}; 