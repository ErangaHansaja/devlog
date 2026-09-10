export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}

export function validateLogInput(title: string, content: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!title.trim()) {
    errors.title = 'Title is required';
  }

  if (!content.trim()) {
    errors.content = 'Content is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}
