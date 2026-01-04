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

export const AdminDashboard: React.FC = () => {
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [instructors, setInstructors] = useState<InstructorAnalysis[]>([]);
  const [teams, setTeams] = useState<TeamAnalysis[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('1m');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, instructorsData, teamsData] = await Promise.all([
        fetchDashboardStats(),
        fetchInstructorAnalysis(period),
        fetchTeamAnalysis(period),
      ]);

      setStats(statsData);
      setInstructors(instructorsData);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
  };

  const handleScheduleClick = async (status: ScheduleStatus) => {
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
    setInstructorListModal({ open: true, title, data: instructorList });
  };

  const handleTeamChartClick = async (team: TeamAnalysis) => {
    setTeamDetailModal({ open: true, data: null, loading: true });
    try {
      const data = await fetchTeamDetail(team.id, period);
      setTeamDetailModal({ open: true, data, loading: false });
    } catch {
      setTeamDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleInstructorRowClick = (instructor: InstructorAnalysis) => {
    setInstructorDashboardModal({ open: true, id: instructor.id, name: instructor.name });
  };

  const handleTeamRowClick = async (team: TeamAnalysis) => {
    await handleTeamChartClick(team);
  };

  const handleInstructorFromList = (instructor: InstructorAnalysis) => {
    setInstructorListModal((prev) => ({ ...prev, open: false }));
    setInstructorDashboardModal({ open: true, id: instructor.id, name: instructor.name });
  };

  const handleMemberFromTeam = (member: { id: number; name: string }) => {
    setTeamDetailModal((prev) => ({ ...prev, open: false }));
    setInstructorDashboardModal({ open: true, id: member.id, name: member.name });
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">관리자 대시보드</h2>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 현황 요약
        </p>
      </div>

      {/* Charts Row - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <EducationStatusChart stats={stats} onSegmentClick={handleScheduleClick} />
        <WorkloadHistogram
          instructors={instructors}
          period={period}
          onPeriodChange={handlePeriodChange}
          onBarClick={handleWorkloadBarClick}
        />
        <TeamWorkloadChart
          teams={teams}
          period={period}
          onPeriodChange={handlePeriodChange}
          onBarClick={handleTeamChartClick}
        />
      </div>

      {/* Analysis Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">상세 분석</h3>
        <AnalysisTable
          instructors={instructors}
          teams={teams}
          period={period}
          onPeriodChange={handlePeriodChange}
          onInstructorClick={handleInstructorRowClick}
          onTeamClick={handleTeamRowClick}
        />
      </div>

      {/* Modals */}
      <ScheduleListModal
        isOpen={scheduleModal.open}
        onClose={() => setScheduleModal((prev) => ({ ...prev, open: false }))}
        title={scheduleModal.status ? STATUS_LABELS[scheduleModal.status] : ''}
        schedules={scheduleModal.data}
        loading={scheduleModal.loading}
      />

      <InstructorListModal
        isOpen={instructorListModal.open}
        onClose={() => setInstructorListModal((prev) => ({ ...prev, open: false }))}
        title={instructorListModal.title}
        instructors={instructorListModal.data}
        onInstructorClick={handleInstructorFromList}
      />

      <TeamDetailModal
        isOpen={teamDetailModal.open}
        onClose={() => setTeamDetailModal((prev) => ({ ...prev, open: false }))}
        teamDetail={teamDetailModal.data}
        loading={teamDetailModal.loading}
        onMemberClick={handleMemberFromTeam}
      />

      <InstructorDashboardModal
        isOpen={instructorDashboardModal.open}
        onClose={() => setInstructorDashboardModal((prev) => ({ ...prev, open: false }))}
        instructorId={instructorDashboardModal.id}
        instructorName={instructorDashboardModal.name}
      />
    </div>
  );
};
