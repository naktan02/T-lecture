import { useEffect, useState } from 'react';
import { getStoredCurrentUser } from '../../../shared/auth/session';
import { logger } from '../../../shared/utils';

interface StoredUser {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

export const useCurrentUser = (): string => {
  const [userLabel, setUserLabel] = useState<string>('User');

  useEffect(() => {
    try {
      const user = getStoredCurrentUser<StoredUser>();
      setUserLabel(user?.name || user?.email || 'User');
    } catch (error) {
      logger.error('Failed to parse user info:', error);
    }
  }, []);

  return userLabel;
};
