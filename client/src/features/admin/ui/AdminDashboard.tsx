import React, { useEffect, useState } from 'react';
import {
  fetchDashboardStats,
  fetchInstructorAnalysis,
  fetchTeamAnalysis,
  DashboardStats,
  InstructorAnalysis,
  TeamAnalysis,
} from '../dashboardApi';
import { StatisticsGrid } from './dashboard/StatisticsGrid';
import { EducationStatusChart } from './dashboard/EducationStatusChart';
import { WorkloadHistogram } from './dashboard/WorkloadHistogram';
import { AnalysisTable } from './dashboard/AnalysisTable';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [instructors, setInstructors] = useState<InstructorAnalysis[]>([]);
  const [teams, setTeams] = useState<TeamAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, instructorsData, teamsData] = await Promise.all([
          fetchDashboardStats(),
          fetchInstructorAnalysis(),
          fetchTeamAnalysis(),
        ]);

        setStats(statsData);
        setInstructors(instructorsData);
        setTeams(teamsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로딩 실패');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          재시도
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">관리자 대시보드</h2>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 현황 요약
        </p>
      </div>

      <StatisticsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EducationStatusChart stats={stats} />
        <WorkloadHistogram instructors={instructors} />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">상세 분석</h3>
        <AnalysisTable instructors={instructors} teams={teams} />
      </div>
    </div>
  );
};
