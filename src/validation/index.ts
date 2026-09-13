import type { TechStack } from '../models';

export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}

/**
 * Validates project creation/update input.
 */
export function validateProjectInput(
  name: string,
  techStack?: TechStack
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!name.trim()) {
    errors.name = 'Project name is required';
  }

  // Ensure tech stack arrays (if provided) don't contain empty strings
  if (techStack) {
    const categories = ['frontend', 'backend', 'mobile', 'tools'] as const;
    for (const cat of categories) {
      const items = techStack[cat];
      if (items && items.some((item) => !item.trim())) {
        errors[cat] = `${cat} contains empty entries`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Validates a raw standup dump before saving.
 */
export function validateStandupDump(rawDump: string): ValidationResult {
  const errors: Record<string, string> = {};

  const trimmed = rawDump.trim();
  if (!trimmed) {
    errors.rawDump = 'Standup dump is required';
  } else if (trimmed.length < 10) {
    errors.rawDump = 'Please write at least 10 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Validates a feature name before adding to a project.
 */
export function validateFeatureInput(name: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!name.trim()) {
    errors.name = 'Feature name is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}
