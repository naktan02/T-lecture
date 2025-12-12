// client/src/features/admin/model/useSuperAdmin.js
import { useState, useEffect } from 'react';
// 💡 방금 만든 API 함수들을 import
import { 
    fetchUsers, fetchPendingUsers, 
    approveUserApi, rejectUserApi, 
    grantAdminApi, revokeAdminApi 
} from '../adminApi';

export const useSuperAdmin = () => {
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                const [approvedData, pendingData] = await Promise.all([
                    fetchUsers(),
                    fetchPendingUsers()
                ]);
                
                setUsers(approvedData);
                setPendingUsers(pendingData);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // ✅ 액션 함수들도 API 호출부만 교체
    const approveUser = async (userId) => {
        try {
            const data = await approveUserApi(userId); // API 호출
            
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            if (data.user) {
                setUsers(prev => [...prev, data.user]);
            } else {
                alert('승인되었습니다.');
            }
        } catch (e) {
            alert(e.message);
        }
    };

    const rejectUser = async (userId) => {
        try {
            await rejectUserApi(userId); // API 호출
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            alert(e.message);
        }
    };

    const grantAdmin = async (userId, level = 'GENERAL') => {
        try {
            await grantAdminApi(userId, level); // API 호출
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, admin: { userId, level } } : u
            ));
        } catch (e) {
            alert(e.message);
        }
    };

    const revokeAdmin = async (userId) => {
        try {
            await revokeAdminApi(userId); // API 호출
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, admin: null } : u
            ));
        } catch (e) {
            alert(e.message);
        }
    };

    
    const filtered = users.filter(u => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.userEmail || '').toLowerCase().includes(q)
        );
    });

    const approvedUsers = filtered.filter(u => u.status === 'APPROVED');
    const normalUsers = approvedUsers.filter(u => !u.instructor && !u.admin);
    const instructors = approvedUsers.filter(u => !!u.instructor && !u.admin);
    const admins = approvedUsers.filter(u => !!u.admin);

    return {
        loading, error, search, setSearch,
        pendingUsers, normalUsers, instructors, admins,
        approveUser, rejectUser, grantAdmin, revokeAdmin
    };
};