/**
 * Simple validation functions without any dependencies
 */

export function validateUsername(value: string): boolean | string {
  if (value.length < 3) {
    return "Username must be at least 3 characters";
  }
  return true;
}

export function validatePassword(value: string): boolean | string {
  if (value.length < 6) {
    return "Password must be at least 6 characters";
  }
  return true;
}

// Helper to create a simple form validator
export function createValidator(validations: Record<string, (value: any) => boolean | string>) {
  return (values: Record<string, any>) => {
    const errors: Record<string, { message: string }> = {};
    
    for (const [field, validate] of Object.entries(validations)) {
      const result = validate(values[field]);
      if (result !== true) {
        errors[field] = { message: result as string };
      }
    }
    
    return {
      values: Object.keys(errors).length === 0 ? values : {},
      errors
    };
  };
} 