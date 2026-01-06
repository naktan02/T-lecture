import React from 'react';
import { UnitDetail, ScheduleStatus } from '../../dashboardApi';

const STATUS_COLORS: Record<ScheduleStatus, string> = {
  completed: 'bg-green-100 text-green-800',
  inProgress: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  unassigned: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  completed: '완료',
  inProgress: '진행 중',
  scheduled: '예정',
  unassigned: '미배정',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  unitDetail: UnitDetail | null;
  loading: boolean;
}

export const UnitDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onBack,
  unitDetail,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-gray-600 text-xl"
                title="뒤로가기"
              >
                ←
              </button>
            )}
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '로딩 중...' : unitDetail?.name || '부대 상세'}
            </h3>
            {unitDetail && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[unitDetail.status]}`}
              >
                {STATUS_LABELS[unitDetail.status]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : !unitDetail ? (
            <p className="text-center text-gray-500 py-12">부대 정보를 불러올 수 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {/* Unit Info Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">부대 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">부대명</p>
                    <p className="text-sm font-medium text-gray-900">{unitDetail.name}</p>
                  </div>
                  {unitDetail.address && (
                    <div>
                      <p className="text-xs text-gray-400">주소</p>
                      <p className="text-sm text-gray-900">
                        {unitDetail.address}
                        {unitDetail.addressDetail && ` ${unitDetail.addressDetail}`}
                      </p>
                    </div>
                  )}
                  {unitDetail.officerName && (
                    <div>
                      <p className="text-xs text-gray-400">담당자</p>
                      <p className="text-sm text-gray-900">{unitDetail.officerName}</p>
                    </div>
                  )}
                  {unitDetail.officerPhone && (
                    <div>
                      <p className="text-xs text-gray-400">연락처</p>
                      <p className="text-sm text-gray-900">{unitDetail.officerPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedules Table */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  교육 일정 ({unitDetail.schedules.length}건)
                </h4>
                {unitDetail.schedules.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">등록된 일정이 없습니다.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          교육일
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          배정 강사
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {unitDetail.schedules.map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{schedule.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {schedule.instructors.length > 0
                              ? schedule.instructors.map((i) => i.name).join(', ')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
