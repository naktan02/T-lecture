import React from 'react';
import { CommonHeader } from '../../../../shared/ui/CommonHeader';
import { useCurrentUser } from '../../../auth/model/useCurrentUser';

export const AdminHeader = () => {
    const userLabel = useCurrentUser();
    // 일반 관리자는 특별한 메뉴가 없다면 빈 배열 혹은 필요한 메뉴 추가
    const links = [
        { label: '권한 관리', path: '/admin/super' },
        { label: '강사 배정', path: '/admin/assignments' },
        { label: '부대 관리', path: '/admin/units' },
    ]; 

    return (
        <CommonHeader
            title="관리자 페이지"
            userLabel={userLabel}
            links={links}
        />
    );
};