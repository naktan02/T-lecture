// src/features/user/ui/headers/UserHeader.tsx
import React from 'react';
import { CommonHeader } from '../../../../shared/ui/CommonHeader';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';

interface NavLink {
  label: string;
  path: string;
}

export const UserHeader: React.FC = () => {
  const userLabel = useCurrentUser();

  const links: NavLink[] = [
    { label: '내 정보', path: '/user-main/profile' },
    { label: '신청 현황', path: '/user-main/status' },
  ];

  return <CommonHeader title="T-Lecture" userLabel={userLabel} links={links} />;
};
