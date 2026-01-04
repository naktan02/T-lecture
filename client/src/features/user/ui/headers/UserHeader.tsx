// src/features/user/ui/headers/UserHeader.tsx
import React from 'react';
import { CommonHeader } from '../../../../shared/ui';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';
import { useAuth } from '../../../auth/model/useAuth';

interface NavLink {
  label: string;
  path: string;
}

export const UserHeader: React.FC = () => {
  const userLabel = useCurrentUser();
  const { isInstructor } = useAuth();

  const links: NavLink[] = [
    { label: '배정 알림', path: '/user-main/dispatches' }, // 모든 사용자에게 표시
  ];

  // 강사인 경우에만 일정 관리 및 공지사항/문의사항 메뉴 추가
  if (isInstructor) {
    links.push({ label: '대시보드', path: '/instructor/dashboard' });
    links.push({ label: '일정 관리', path: '/instructor/schedule' });
    links.push({ label: '공지사항', path: '/instructor/notices' });
    links.push({ label: '문의사항', path: '/instructor/inquiries' });
  }

  // 내 정보는 항상 마지막
  links.push({ label: '내 정보', path: '/user-main/profile' });

  return <CommonHeader title="T-Lecture" userLabel={userLabel} links={links} />;
};
