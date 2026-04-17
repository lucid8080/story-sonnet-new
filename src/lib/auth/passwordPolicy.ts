/** Shared rules for signup and password change (not enforced on login). */

export const MIN_PASSWORD_LENGTH = 8;

/** Short hint for forms (signup, account settings). */
export const PASSWORD_REQUIREMENTS_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, with at least one letter and one number.`;

export type PasswordPolicyMode = 'register' | 'change';

/**
 * Returns `null` if valid, otherwise an error message for API responses.
 */
export function validatePasswordPolicy(
  password: string,
  mode: PasswordPolicyMode = 'register'
): string | null {
  const label = mode === 'change' ? 'New password' : 'Password';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `${label} must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return `${label} must contain at least one letter and one number.`;
  }
  return null;
}
