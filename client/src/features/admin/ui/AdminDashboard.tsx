import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchDashboardStats,
  fetchInstructorAnalysis,
  fetchTeamAnalysis,
  fetchSchedulesByStatus,
  fetchTeamDetail,
  DashboardStats,
  InstructorAnalysis,
  TeamAnalysis,
  ScheduleListItem,
  TeamDetail,
  PeriodFilter,
  ScheduleStatus,
} from '../dashboardApi';
import { EducationStatusChart } from './dashboard/EducationStatusChart';
import { WorkloadHistogram } from './dashboard/WorkloadHistogram';
import { TeamWorkloadChart } from './dashboard/TeamWorkloadChart';
import { AnalysisTable } from './dashboard/AnalysisTable';
import { ScheduleListModal } from './dashboard/ScheduleListModal';
import { InstructorListModal } from './dashboard/InstructorListModal';
import { TeamDetailModal } from './dashboard/TeamDetailModal';
import { InstructorDashboardModal } from './dashboard/InstructorDashboardModal';

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  completed: '완료된 교육',
  inProgress: '진행 중인 교육',
  scheduled: '예정된 교육',
  unassigned: '미배정 교육',
};

// Modal type for tracking navigation history
type ModalType = 'schedule' | 'instructorList' | 'teamDetail' | 'instructorDashboard' | null;

export const AdminDashboard: React.FC = () => {
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [instructors, setInstructors] = useState<InstructorAnalysis[]>([]);
  const [teams, setTeams] = useState<TeamAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [rangeType, setRangeType] = useState<string>('1m'); // '1m', '3m', '6m', '12m', 'custom'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal navigation stack - tracks parent modal for back navigation
  const [modalStack, setModalStack] = useState<ModalType[]>([]);

  // Modal states
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean;
    status: ScheduleStatus | null;
    data: ScheduleListItem[];
    loading: boolean;
  }>({ open: false, status: null, data: [], loading: false });

  const [instructorListModal, setInstructorListModal] = useState<{
    open: boolean;
    title: string;
    data: InstructorAnalysis[];
  }>({ open: false, title: '', data: [] });

  const [teamDetailModal, setTeamDetailModal] = useState<{
    open: boolean;
    data: TeamDetail | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  const [instructorDashboardModal, setInstructorDashboardModal] = useState<{
    open: boolean;
    id: number;
    name: string;
  }>({ open: false, id: 0, name: '' });

  // Date calculation effect
  useEffect(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (rangeType === '1m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (rangeType === '3m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 3);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (rangeType === '6m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 6);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (rangeType === '12m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 12);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    }
    // custom: keep existing values
  }, [rangeType]);

  // Load data
  const loadData = useCallback(async () => {
    // If custom and dates are missing, don't fetch yet
    if (rangeType === 'custom' && (!startDate || !endDate)) {
      return;
    }

    try {
      setLoading(true);

      const params = {
        startDate: rangeType === 'custom' ? startDate : undefined,
        endDate: rangeType === 'custom' ? endDate : undefined,
        period: rangeType !== 'custom' ? (rangeType as PeriodFilter) : undefined,
      };

      // If we pass explicit dates even for '1m', '3m', etc., backend can handle it universally
      // Let's pass explicit dates if calculated, to be safe and consistent.
      // However, our backend controller supports 'period' fallback.
      // Let's pass startDate/endDate if they exist.
      const queryParams = {
        startDate,
        endDate,
      };

      const [statsData, instructorsData, teamsData] = await Promise.all([
        fetchDashboardStats(),
        fetchInstructorAnalysis(queryParams),
        fetchTeamAnalysis(queryParams),
      ]);

      setStats(statsData);
      setInstructors(instructorsData);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [rangeType, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close all modals helper
  const closeAllModals = () => {
    setScheduleModal((prev) => ({ ...prev, open: false }));
    setInstructorListModal((prev) => ({ ...prev, open: false }));
    setTeamDetailModal((prev) => ({ ...prev, open: false }));
    setInstructorDashboardModal((prev) => ({ ...prev, open: false }));
    setModalStack([]);
  };

  // Navigate back to previous modal
  const handleBack = () => {
    if (modalStack.length > 0) {
      const newStack = [...modalStack];
      newStack.pop(); // Remove current modal
      setModalStack(newStack);

      // Close current instructor dashboard modal
      setInstructorDashboardModal((prev) => ({ ...prev, open: false }));

      // The parent modal is still open if it was in the stack
      // Since we didn't close parent modals when navigating forward, they're still open
    } else {
      // No parent, close everything
      closeAllModals();
    }
  };

  // Handlers
  const handleScheduleClick = async (status: ScheduleStatus) => {
    setModalStack(['schedule']);
    setScheduleModal({ open: true, status, data: [], loading: true });
    try {
      const data = await fetchSchedulesByStatus(status);
      setScheduleModal((prev) => ({ ...prev, data, loading: false }));
    } catch {
      setScheduleModal((prev) => ({ ...prev, data: [], loading: false }));
    }
  };

  const handleWorkloadBarClick = (count: number, instructorList: InstructorAnalysis[]) => {
    const title = count === 13 ? '12회 이상 강사' : `${count}회 강사`;
    setModalStack(['instructorList']);
    setInstructorListModal({ open: true, title, data: instructorList });
  };

  const handleTeamChartClick = async (team: TeamAnalysis) => {
    setModalStack(['teamDetail']);
    setTeamDetailModal({ open: true, data: null, loading: true });
    try {
      const queryParams = { startDate, endDate };
      const data = await fetchTeamDetail(team.id, queryParams);
      setTeamDetailModal({ open: true, data, loading: false });
    } catch {
      setTeamDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleInstructorRowClick = (instructor: InstructorAnalysis) => {
    setModalStack(['instructorDashboard']);
    setInstructorDashboardModal({ open: true, id: instructor.id, name: instructor.name });
  };

  const handleTeamRowClick = async (team: TeamAnalysis) => {
    await handleTeamChartClick(team);
  };

  // Navigate from InstructorList to InstructorDashboard (keep parent open)
  const handleInstructorFromList = (instructor: InstructorAnalysis) => {
    setModalStack((prev) => [...prev, 'instructorDashboard']);
    setInstructorDashboardModal({ open: true, id: instructor.id, name: instructor.name });
  };

  // Navigate from TeamDetail to InstructorDashboard (keep parent open)
  const handleMemberFromTeam = (member: { id: number; name: string }) => {
    setModalStack((prev) => [...prev, 'instructorDashboard']);
    setInstructorDashboardModal({ open: true, id: member.id, name: member.name });
  };

  // Close handlers with back navigation support
  const handleScheduleModalClose = () => {
    setScheduleModal((prev) => ({ ...prev, open: false }));
    setModalStack([]);
  };

  const handleInstructorListModalClose = () => {
    setInstructorListModal((prev) => ({ ...prev, open: false }));
    setModalStack([]);
  };

  const handleTeamDetailModalClose = () => {
    setTeamDetailModal((prev) => ({ ...prev, open: false }));
    setModalStack([]);
  };

  const handleInstructorDashboardModalClose = () => {
    // Check if we should go back to a parent modal
    if (modalStack.length > 1) {
      handleBack();
    } else {
      setInstructorDashboardModal((prev) => ({ ...prev, open: false }));
      setModalStack([]);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          재시도
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen overflow-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">관리자 대시보드</h2>

        {/* Global Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="1m">최근 1개월</option>
            <option value="3m">최근 3개월</option>
            <option value="6m">최근 6개월</option>
            <option value="12m">최근 12개월</option>
            <option value="custom">직접 설정</option>
          </select>

          {rangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Charts Row - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <EducationStatusChart stats={stats} onSegmentClick={handleScheduleClick} />
        <WorkloadHistogram instructors={instructors} onBarClick={handleWorkloadBarClick} />
        <TeamWorkloadChart teams={teams} onBarClick={handleTeamChartClick} />
      </div>

      {/* Analysis Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">상세 분석</h3>
        <AnalysisTable
          instructors={instructors}
          teams={teams}
          onInstructorClick={handleInstructorRowClick}
          onTeamClick={handleTeamRowClick}
        />
      </div>

      {/* Modals */}
      <ScheduleListModal
        isOpen={scheduleModal.open}
        onClose={handleScheduleModalClose}
        title={scheduleModal.status ? STATUS_LABELS[scheduleModal.status] : ''}
        schedules={scheduleModal.data}
        loading={scheduleModal.loading}
      />

      <InstructorListModal
        isOpen={instructorListModal.open}
        onClose={handleInstructorListModalClose}
        title={instructorListModal.title}
        instructors={instructorListModal.data}
        onInstructorClick={handleInstructorFromList}
      />

      <TeamDetailModal
        isOpen={teamDetailModal.open}
        onClose={handleTeamDetailModalClose}
        teamDetail={teamDetailModal.data}
        loading={teamDetailModal.loading}
        onMemberClick={handleMemberFromTeam}
      />

      <InstructorDashboardModal
        isOpen={instructorDashboardModal.open}
        onClose={handleInstructorDashboardModalClose}
        onBack={modalStack.length > 1 ? handleBack : undefined}
        instructorId={instructorDashboardModal.id}
        instructorName={instructorDashboardModal.name}
      />
    </div>
  );
};
