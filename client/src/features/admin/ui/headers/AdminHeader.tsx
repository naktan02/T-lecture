// src/features/admin/ui/headers/AdminHeader.tsx
import React from 'react';
import { CommonHeader, NavLink } from '../../../../shared/ui';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';

export const AdminHeader: React.FC = () => {
  const userLabel = useCurrentUser();

  const links: NavLink[] = [
    { label: '대시보드', path: '/admin' },
    {
      label: '관리',
      children: [
        { label: '유저 수락', path: '/admin/super' },
        { label: '유저 관리', path: '/admin/users' },
        { label: '부대 관리', path: '/admin/units' },
      ],
    },
    {
      label: '배정',
      children: [
        { label: '강사 배정', path: '/admin/assignments' },
        { label: '배정 설정', path: '/admin/assignment-settings' },
      ],
    },
    {
      label: '게시판',
      children: [
        { label: '공지사항', path: '/admin/notices' },
        { label: '문의사항', path: '/admin/inquiries' },
      ],
    },
    { label: '설정', path: '/admin/settings' },
  ];

  return <CommonHeader title="관리자 페이지" userLabel={userLabel} links={links} />;
};
