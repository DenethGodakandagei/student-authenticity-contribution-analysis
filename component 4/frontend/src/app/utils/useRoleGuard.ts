// app/utils/useRoleGuard.ts
//
// Role guard hook for client components.
//
// Usage:
//   const { ready } = useRoleGuard('student');
//   if (!ready) return <main className="dash-loading"><span className="dash-spinner" /></main>;
//
// Behaviour:
//   - No token  → replace('/login')
//   - Token but wrong role → replace(destinationFor(actualRole))
//   - Token with correct role → ready = true  (render allowed)
//
// The check runs once on mount; subsequent token changes (logout in another
// tab) are handled by the existing subscribeAuth listener inside each page.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getStoredUser } from './api';
import { destinationFor, type AuthRole } from '../auth/authService';

export interface RoleGuardResult {
  /** true once the auth check has passed and the page may render its content. */
  ready: boolean;
}

export function useRoleGuard(required: AuthRole): RoleGuardResult {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    const user = getStoredUser();
    const actualRole = (user as { role?: string } | null)?.role;

    if (actualRole !== required) {
      // Redirect to the user's actual home (not /login) so they land somewhere
      // meaningful instead of seeing an error.
      const safeRole: AuthRole =
        actualRole === 'student' || actualRole === 'lecturer' ? actualRole : 'student';
      router.replace(destinationFor(safeRole));
      return;
    }

    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready };
}
