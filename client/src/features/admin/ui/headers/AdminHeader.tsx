// src/features/admin/ui/headers/AdminHeader.tsx
import React from 'react';
import { CommonHeader } from '../../../../shared/ui';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';

interface NavLink {
  label: string;
  path: string;
}

export const AdminHeader: React.FC = () => {
  const userLabel = useCurrentUser();

  const links: NavLink[] = [
    { label: '권한 관리', path: '/admin/super' },
    { label: '강사 배정', path: '/admin/assignments' },
    { label: '부대 관리', path: '/admin/units' },
    { label: '시스템 설정', path: '/admin/settings' },
  ];

  return <CommonHeader title="관리자 페이지" userLabel={userLabel} links={links} />;
};
