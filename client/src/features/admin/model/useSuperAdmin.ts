// client/src/features/admin/model/useSuperAdmin.ts
import { useState, useEffect } from 'react';
import {
  fetchUsers,
  fetchPendingUsers,
  approveUserApi,
  rejectUserApi,
  grantAdminApi,
  revokeAdminApi,
  grantInstructorApi,
  revokeInstructorApi,
  User,
  UserActionResponse,
} from '../adminApi';
import type { AdminLevel } from '../../../shared/constants';
import { showSuccess, showError, showConfirm } from '../../../shared/utils';

interface AdminInfo {
  userId: number;
  level: AdminLevel;
}

interface InstructorInfo {
  userId: number;
}

interface UserWithAdmin extends User {
  admin?: AdminInfo | null;
  instructor?: InstructorInfo | null;
  userEmail?: string;
}

interface UseSuperAdminReturn {
  loading: boolean;
  error: string;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  pendingUsers: User[];
  normalUsers: UserWithAdmin[];
  instructorUsers: UserWithAdmin[];
  adminUsers: UserWithAdmin[];
  approveUser: (userId: number) => Promise<void>;
  rejectUser: (userId: number) => Promise<void>;
  grantAdmin: (userId: number, level?: AdminLevel) => Promise<void>;
  revokeAdmin: (userId: number) => Promise<void>;
  grantInstructor: (userId: number) => Promise<void>;
  revokeInstructor: (userId: number) => Promise<void>;
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

        setUsers(approvedData.data as unknown as UserWithAdmin[]);
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
      showSuccess('관리자 권한이 부여되었습니다.');
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const revokeAdmin = async (userId: number): Promise<void> => {
    try {
      await revokeAdminApi(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, admin: null } : u)));
      showSuccess('관리자 권한이 회수되었습니다.');
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const grantInstructor = async (userId: number): Promise<void> => {
    try {
      await grantInstructorApi(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, instructor: { userId } } : u)));
      showSuccess('강사 역할이 부여되었습니다.');
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const revokeInstructor = async (userId: number): Promise<void> => {
    const confirmed = await showConfirm(
      '강사 역할을 회수하시겠습니까?\n\n⚠️ 강사 정보(주소, 덕목, 가용일 등)가 삭제됩니다.',
    );
    if (confirmed) {
      try {
        await revokeInstructorApi(userId);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, instructor: null } : u)));
        showSuccess('강사 역할이 회수되었습니다.');
      } catch (e) {
        showError((e as Error).message);
      }
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
  // 듀얼 역할 지원: 각 역할별로 독립적 필터링
  const normalUsers = approvedUsers.filter((u) => !u.instructor && !u.admin);
  const instructorUsers = approvedUsers.filter((u) => !!u.instructor); // 관리자 여부 무관
  const adminUsers = approvedUsers.filter((u) => !!u.admin); // 강사 여부 무관

  return {
    loading,
    error,
    search,
    setSearch,
    pendingUsers,
    normalUsers,
    instructorUsers,
    adminUsers,
    approveUser,
    rejectUser,
    grantAdmin,
    revokeAdmin,
    grantInstructor,
    revokeInstructor,
  };
};
