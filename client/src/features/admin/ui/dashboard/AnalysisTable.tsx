import React, { useState } from 'react';
import { InstructorAnalysis, TeamAnalysis, PeriodFilter } from '../../dashboardApi';

interface Props {
  instructors: InstructorAnalysis[];
  teams: TeamAnalysis[];
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  onInstructorClick: (instructor: InstructorAnalysis) => void;
  onTeamClick: (team: TeamAnalysis) => void;
}

type Tab = 'INSTRUCTOR' | 'TEAM';
type SortField = string;
type SortDirection = 'asc' | 'desc';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '1m', label: '이번달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
];

export const AnalysisTable: React.FC<Props> = ({
  instructors,
  teams,
  period,
  onPeriodChange,
  onInstructorClick,
  onTeamClick,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('INSTRUCTOR');
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Filter & Sort Instructors
  const filteredInstructors = instructors
    .filter(
      (i) =>
        i.name.toLowerCase().includes(filter.toLowerCase()) ||
        i.team?.toLowerCase().includes(filter.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      let aVal: number = 0,
        bVal: number = 0;
      if (sortField === 'completedCount') {
        aVal = a.completedCount;
        bVal = b.completedCount;
      } else if (sortField === 'acceptanceRate') {
        aVal = a.acceptanceRate;
        bVal = b.acceptanceRate;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // Filter & Sort Teams
  const filteredTeams = teams
    .filter((t) => t.teamName.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;
      let aVal: number = 0,
        bVal: number = 0;
      if (sortField === 'memberCount') {
        aVal = a.memberCount;
        bVal = b.memberCount;
      } else if (sortField === 'completedCount') {
        aVal = a.completedCount;
        bVal = b.completedCount;
      } else if (sortField === 'averageCompleted') {
        aVal = a.averageCompleted;
        bVal = b.averageCompleted;
      } else if (sortField === 'activeMemberRate') {
        aVal = a.activeMemberRate;
        bVal = b.activeMemberRate;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col"
      style={{ maxHeight: 'calc(100vh - 600px)', minHeight: '300px' }}
    >
      <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setActiveTab('INSTRUCTOR');
              setSortField('');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'INSTRUCTOR'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            강사 현황
          </button>
          <button
            onClick={() => {
              setActiveTab('TEAM');
              setSortField('');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'TEAM'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            팀 현황
          </button>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="검색..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
          />
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            {activeTab === 'INSTRUCTOR' ? (
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  직책
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  팀
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('completedCount')}
                >
                  교육 진행수 {getSortIcon('completedCount')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('acceptanceRate')}
                >
                  수락률 {getSortIcon('acceptanceRate')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  활동 여부
                </th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  팀명
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('memberCount')}
                >
                  팀원 수 {getSortIcon('memberCount')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('completedCount')}
                >
                  교육 진행수 {getSortIcon('completedCount')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageCompleted')}
                >
                  인당 평균 {getSortIcon('averageCompleted')}
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('activeMemberRate')}
                >
                  가동률 {getSortIcon('activeMemberRate')}
                </th>
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activeTab === 'INSTRUCTOR' ? (
              filteredInstructors.length > 0 ? (
                filteredInstructors.map((inst) => (
                  <tr
                    key={inst.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onInstructorClick(inst)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {inst.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inst.role || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inst.team || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                      {inst.completedCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {inst.acceptanceRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          inst.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {inst.isActive ? '활동' : '미활동'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              )
            ) : filteredTeams.length > 0 ? (
              filteredTeams.map((team) => (
                <tr
                  key={team.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onTeamClick(team)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.teamName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {team.memberCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                    {team.completedCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {team.averageCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {team.activeMemberRate}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
