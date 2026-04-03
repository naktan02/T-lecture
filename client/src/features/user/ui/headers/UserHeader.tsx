import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CommonHeader, NavLink } from '../../../../shared/ui';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';
import { useAuth } from '../../../auth/model/useAuth';
import { getMyHeaderCounts } from '../../api/user.me.api';

interface UserHeaderProps {
  onRefresh?: () => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ onRefresh }) => {
  const userLabel = useCurrentUser();
  const { isInstructor } = useAuth();
  const { data: headerCounts } = useQuery({
    queryKey: ['userHeaderCounts'],
    queryFn: getMyHeaderCounts,
    staleTime: 30 * 1000,
  });

  const links: NavLink[] = [
    {
      label: '배정 알림',
      path: '/user-main/dispatches',
      badgeCount: headerCounts?.dispatchUnreadCount,
    },
  ];

  if (isInstructor) {
    links.push({ label: '일정 관리', path: '/instructor/schedule' });
    links.push({ label: '대시보드', path: '/instructor/dashboard' });
    links.push({
      label: '공지사항',
      path: '/instructor/notices',
      badgeCount: headerCounts?.noticeUnreadCount,
    });
    links.push({
      label: '문의사항',
      path: '/instructor/inquiries',
      badgeCount: headerCounts?.inquiryUnreadAnswerCount,
    });
  }

  links.push({ label: '내 정보', path: '/user-main/profile' });

  return (
    <CommonHeader
      title="T-Lecture"
      userLabel={userLabel}
      links={links}
      logoPath="/user-main/profile"
      onRefresh={onRefresh}
    />
  );
};
