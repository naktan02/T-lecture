// src/features/admin/ui/headers/SuperAdminHeader.tsx
import React from 'react';
import { CommonHeader } from '../../../../shared/ui';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';

interface NavLink {
  label: string;
  path: string;
}

export const SuperAdminHeader: React.FC = () => {
  const userLabel = useCurrentUser();

  const links: NavLink[] = [];

  return <CommonHeader title="슈퍼 관리자" userLabel={userLabel} links={links} />;
};
