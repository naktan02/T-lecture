// client/src/features/auth/model/useCurrentUser.ts
import { useState, useEffect } from 'react';
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
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user: StoredUser = JSON.parse(userStr);
        // 이름이 없으면 이메일, 그것도 없으면 기본값
        setUserLabel(user.name || user.email || 'User');
      }
    } catch (e) {
      logger.error('Failed to parse user info:', e);
    }
  }, []);

  return userLabel;
};
