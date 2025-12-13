import React from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { ContentWrapper } from '../../shared/ui/ContentWrapper';
import { AssignmentWorkspace } from '../../features/assignment/ui/AssignmentWorkspace';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AssignmentPage = () => {
    const { shouldRender } = useAuthGuard('ADMIN');
    if (!shouldRender) return null;

    return (
        <>
            <AdminHeader/>
            <ContentWrapper scrollable={false}>
                <AssignmentWorkspace />
            </ContentWrapper>
        </>
    );
};

export default AssignmentPage;