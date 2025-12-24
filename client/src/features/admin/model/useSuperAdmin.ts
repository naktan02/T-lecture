// client/src/features/admin/model/useSuperAdmin.ts
import { useState, useEffect } from 'react';
import {
  fetchUsers,
  fetchPendingUsers,
  approveUserApi,
  rejectUserApi,
  grantAdminApi,
  revokeAdminApi,
  User,
  UserActionResponse,
} from '../adminApi';
import type { AdminLevel } from '../../../shared/constants';
import { showSuccess, showError } from '../../../shared/utils';

interface AdminInfo {
  userId: number;
  level: AdminLevel;
}

interface UserWithAdmin extends User {
  admin?: AdminInfo | null;
  instructor?: unknown;
  userEmail?: string;
}

interface UseSuperAdminReturn {
  loading: boolean;
  error: string;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  pendingUsers: User[];
  normalUsers: UserWithAdmin[];
  instructors: UserWithAdmin[];
  admins: UserWithAdmin[];
  approveUser: (userId: number) => Promise<void>;
  rejectUser: (userId: number) => Promise<void>;
  grantAdmin: (userId: number, level?: AdminLevel) => Promise<void>;
  revokeAdmin: (userId: number) => Promise<void>;
}

export const useSuperAdmin = (): UseSuperAdminReturn => {
  const [users, setUsers] = useState<UserWithAdmin[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [approvedData, pendingData] = await Promise.all([fetchUsers(), fetchPendingUsers()]);

        setUsers(approvedData as unknown as UserWithAdmin[]);
        setPendingUsers(pendingData as unknown as User[]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const approveUser = async (userId: number): Promise<void> => {
    try {
      const data: UserActionResponse = await approveUserApi(userId);

      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      if (data.user) {
        setUsers((prev) => [...prev, data.user as UserWithAdmin]);
      } else {
        showSuccess('승인되었습니다.');
      }
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const rejectUser = async (userId: number): Promise<void> => {
    try {
      await rejectUserApi(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const grantAdmin = async (userId: number, level: AdminLevel = 'GENERAL'): Promise<void> => {
    try {
      await grantAdminApi(userId, level);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, admin: { userId, level } } : u)),
      );
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const revokeAdmin = async (userId: number): Promise<void> => {
    try {
      await revokeAdminApi(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, admin: null } : u)));
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) || (u.userEmail || '').toLowerCase().includes(q)
    );
  });

  const approvedUsers = filtered.filter((u) => u.status === 'APPROVED');
  const normalUsers = approvedUsers.filter((u) => !u.instructor && !u.admin);
  const instructors = approvedUsers.filter((u) => !!u.instructor && !u.admin);
  const admins = approvedUsers.filter((u) => !!u.admin);

  return {
    loading,
    error,
    search,
    setSearch,
    pendingUsers,
    normalUsers,
    instructors,
    admins,
    approveUser,
    rejectUser,
    grantAdmin,
    revokeAdmin,
  };
};
