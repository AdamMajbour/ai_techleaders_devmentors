'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, apiCall, Button } from '@devmentor/ui';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setError(null);
    const result = await apiCall<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' });
    setIsLoggingOut(false);
    if (!result.ok) {
      setError(result.error.message || 'You could not be signed out. Try again.');
      return;
    }
    router.push('/login');
  }

  return (
    <div className="flex flex-col items-end gap-group">
      <Button variant="outline" size="sm" disabled={isLoggingOut} onClick={logout}>
        {isLoggingOut ? 'Signing out…' : 'Log out'}
      </Button>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    </div>
  );
}
