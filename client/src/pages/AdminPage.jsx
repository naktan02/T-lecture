import React from 'react';
import { MainLayout } from '../shared/ui/MainLayout';
import { AdminDashboard } from '../features/admin/ui/AdminDashboard';

const AdminPage = () => {
    return (
        <MainLayout>
        <AdminDashboard />
        </MainLayout>
    );
};

export default AdminPage;