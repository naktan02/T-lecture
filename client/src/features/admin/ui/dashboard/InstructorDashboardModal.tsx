import React, { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
}

// This modal loads the instructor's dashboard stats
// We'll use the existing user dashboard API with the instructor ID

interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    yearCount: number;
    monthCount: number;
  };
  performance: {
    acceptanceRate: number;
    totalProposals: number;
    acceptedCount: number;
  };
  monthlyTrend: { month: string; count: number; hours: number }[];
  recentAssignments: {
    id: number;
    date: string;
    unitName: string;
    unitType: string | null;
    region: string | null;
    status: string;
    distance: number;
    workHours: number;
  }[];
}

export const InstructorDashboardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  instructorId,
  instructorName,
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !instructorId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Note: The user dashboard API is designed for the logged-in user
        // For admin viewing another instructor, we might need a different endpoint
        // For now, we'll show a placeholder with the basic info
        // TODO: Implement admin endpoint to fetch specific instructor's dashboard
        setStats(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, instructorId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{instructorName} 대시보드</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <p className="text-center text-red-500 py-8">{error}</p>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-lg p-8 inline-block">
                <div className="text-6xl mb-4">👤</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{instructorName}</h4>
                <p className="text-gray-500 mb-4">강사 ID: {instructorId}</p>
                <p className="text-sm text-gray-400">
                  상세 대시보드 조회 기능은 추후 업데이트 예정입니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
