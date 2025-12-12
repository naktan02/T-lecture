import React from 'react';
import { AssignmentWorkspace } from '../../features/assignment/ui/AssignmentWorkspace';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AssignmentPage = () => {
    // SUPER_ADMIN 권한이 필요하다고 선언
    const { shouldRender } = useAuthGuard('SUPER_ADMIN');

    // 권한이 없거나 토큰이 없어서 쫓겨나는 중이면 아무것도 렌더링하지 않습니다.
    if (!shouldRender) return null;

    return (
        <AssignmentWorkspace />
    );
};

export default AssignmentPage;
