import type { AccountStatus } from '@prisma/client';

/** Account states that block sign-in and invalidate active sessions. */
export const DEACTIVATED_ACCOUNT_STATUSES: AccountStatus[] = [
  'suspended',
  'banned',
  'deleted',
  'archived',
];

export function isDeactivatedAccountStatus(status: AccountStatus | string): boolean {
  return (DEACTIVATED_ACCOUNT_STATUSES as string[]).includes(status);
}

export function isLoginAllowedAccountStatus(status: AccountStatus | string): boolean {
  return !isDeactivatedAccountStatus(status);
}
