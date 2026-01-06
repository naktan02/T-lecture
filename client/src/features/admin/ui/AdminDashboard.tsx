import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchDashboardStats,
  fetchInstructorAnalysis,
  fetchTeamAnalysis,
  fetchTeamDetail,
  fetchUnitsByStatus,
  fetchUnitDetail,
  DashboardStats,
  InstructorAnalysis,
  TeamAnalysis,
  TeamDetail,
  ScheduleStatus,
  UnitListItem,
  UnitDetail,
} from '../dashboardApi';
import { EducationStatusChart } from './dashboard/EducationStatusChart';
import { WorkloadHistogram } from './dashboard/WorkloadHistogram';
import { TeamWorkloadChart } from './dashboard/TeamWorkloadChart';
import { AnalysisTable } from './dashboard/AnalysisTable';
import { UnitListModal } from './dashboard/UnitListModal';
import { UnitDetailModal } from './dashboard/UnitDetailModal';
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
type ModalType =
  | 'unitList'
  | 'unitDetail'
  | 'instructorList'
  | 'teamDetail'
  | 'instructorDashboard'
  | null;

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

  // Modal states - Unit List (부대 목록)
  const [unitListModal, setUnitListModal] = useState<{
    open: boolean;
    status: ScheduleStatus | null;
    data: UnitListItem[];
    loading: boolean;
  }>({ open: false, status: null, data: [], loading: false });

  // Modal states - Unit Detail (부대 상세)
  const [unitDetailModal, setUnitDetailModal] = useState<{
    open: boolean;
    data: UnitDetail | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

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

  // Helper function to get date range based on rangeType (월 단위)
  // 1m = 이번 달 (1월 1일 ~ 1월 31일)
  // 3m = 최근 3개월 (11월 1일 ~ 1월 31일)
  const getDateRange = useCallback(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    if (rangeType === 'custom') {
      return { startDate, endDate };
    }

    let startMonth: number;
    let startYear: number;

    switch (rangeType) {
      case '1m':
        // 이번 달만
        startMonth = currentMonth;
        startYear = currentYear;
        break;
      case '3m':
        // 최근 3개월 (이번 달 포함)
        startMonth = currentMonth - 2;
        startYear = currentYear;
        break;
      case '6m':
        // 최근 6개월
        startMonth = currentMonth - 5;
        startYear = currentYear;
        break;
      case '12m':
        // 최근 12개월
        startMonth = currentMonth - 11;
        startYear = currentYear;
        break;
      default:
        startMonth = currentMonth;
        startYear = currentYear;
    }

    // 음수 월 처리 (연도 조정)
    while (startMonth < 0) {
      startMonth += 12;
      startYear -= 1;
    }

    // 시작일: 해당 월의 1일
    const start = new Date(startYear, startMonth, 1);

    // 종료일: 이번 달의 마지막 날
    const end = new Date(currentYear, currentMonth + 1, 0);

    return { startDate: formatDate(start), endDate: formatDate(end) };
  }, [rangeType, startDate, endDate]);

  // Load data
  const loadData = useCallback(async () => {
    const { startDate: start, endDate: end } = getDateRange();

    // If custom and dates are missing, don't fetch yet
    if (rangeType === 'custom' && (!start || !end)) {
      return;
    }

    try {
      setLoading(true);

      const queryParams = {
        startDate: start,
        endDate: end,
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
  }, [getDateRange, rangeType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close all modals helper
  const closeAllModals = () => {
    setUnitListModal((prev) => ({ ...prev, open: false }));
    setUnitDetailModal((prev) => ({ ...prev, open: false }));
    setInstructorListModal((prev) => ({ ...prev, open: false }));
    setTeamDetailModal((prev) => ({ ...prev, open: false }));
    setInstructorDashboardModal((prev) => ({ ...prev, open: false }));
    setModalStack([]);
  };

  // Navigate back to previous modal
  const handleBack = () => {
    if (modalStack.length > 1) {
      const newStack = [...modalStack];
      const currentModal = newStack.pop(); // Remove current modal
      setModalStack(newStack);

      // Close the current modal based on type
      if (currentModal === 'unitDetail') {
        setUnitDetailModal((prev) => ({ ...prev, open: false }));
      } else if (currentModal === 'instructorDashboard') {
        setInstructorDashboardModal((prev) => ({ ...prev, open: false }));
      }
    } else {
      // No parent, close everything
      closeAllModals();
    }
  };

  // Handlers - Pie chart segment click (Unit-based)
  const handleStatusClick = async (status: ScheduleStatus) => {
    setModalStack(['unitList']);
    setUnitListModal({ open: true, status, data: [], loading: true });
    try {
      const data = await fetchUnitsByStatus(status);
      setUnitListModal((prev) => ({ ...prev, data, loading: false }));
    } catch {
      setUnitListModal((prev) => ({ ...prev, data: [], loading: false }));
    }
  };

  // Navigate from UnitList to UnitDetail
  const handleUnitClick = async (unit: UnitListItem) => {
    setModalStack((prev) => [...prev, 'unitDetail']);
    setUnitDetailModal({ open: true, data: null, loading: true });
    try {
      const data = await fetchUnitDetail(unit.id);
      setUnitDetailModal({ open: true, data, loading: false });
    } catch {
      setUnitDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleWorkloadBarClick = (label: string, instructorList: InstructorAnalysis[]) => {
    const title = `${label} 완료 강사`;
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
  const handleUnitListModalClose = () => {
    setUnitListModal((prev) => ({ ...prev, open: false }));
    setUnitDetailModal((prev) => ({ ...prev, open: false }));
    setModalStack([]);
  };

  const handleUnitDetailModalClose = () => {
    // Check if we should go back to parent (unit list)
    if (modalStack.length > 1) {
      handleBack();
    } else {
      closeAllModals();
    }
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
        <EducationStatusChart stats={stats} onSegmentClick={handleStatusClick} />
        <WorkloadHistogram
          instructors={instructors}
          onBarClick={handleWorkloadBarClick}
          rangeType={rangeType}
        />
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
      <UnitListModal
        isOpen={unitListModal.open}
        onClose={handleUnitListModalClose}
        title={unitListModal.status ? STATUS_LABELS[unitListModal.status] : ''}
        units={unitListModal.data}
        loading={unitListModal.loading}
        onUnitClick={handleUnitClick}
      />

      <UnitDetailModal
        isOpen={unitDetailModal.open}
        onClose={handleUnitDetailModalClose}
        onBack={modalStack.length > 1 ? handleBack : undefined}
        unitDetail={unitDetailModal.data}
        loading={unitDetailModal.loading}
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
