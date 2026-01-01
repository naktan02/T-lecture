import { ReactElement } from 'react';
import { Inquiry } from '../api/inquiryApi';
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface InquiryListProps {
  inquiries: Inquiry[];
  onInquiryClick: (id: number) => void;
  isAdmin?: boolean;
  currentPage?: number;
  totalCount?: number;
  pageSize?: number;
}

export const InquiryList = ({
  inquiries,
  onInquiryClick,
  isAdmin = false,
  currentPage = 1,
  totalCount = 0,
  pageSize = 10,
}: InquiryListProps): ReactElement => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // NO 번호 계산 (최신순)
  const getNo = (index: number) => {
    const startNo = totalCount - (currentPage - 1) * pageSize;
    return startNo - index;
  };

  if (inquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <ClockIcon className="w-12 h-12 mb-3" />
        <p className="text-sm">문의사항이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 데스크톱 뷰 */}
      <table className="hidden md:table w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">
              No
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              제목
            </th>
            {isAdmin && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                작성자
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
              상태
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">
              작성일
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {inquiries.map((inquiry, index) => (
            <tr
              key={inquiry.id}
              onClick={() => onInquiryClick(inquiry.id)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-sm text-gray-500">{getNo(index)}</td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-900 hover:text-indigo-600">{inquiry.title}</span>
              </td>
              {isAdmin && (
                <td className="px-4 py-3 text-sm text-gray-500">{inquiry.author.name || '-'}</td>
              )}
              <td className="px-4 py-3">
                {inquiry.status === 'Waiting' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    <ClockIcon className="w-3 h-3" />
                    대기중
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    <CheckCircleIcon className="w-3 h-3" />
                    답변완료
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inquiry.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 모바일 뷰 */}
      <div className="md:hidden divide-y divide-gray-100">
        {inquiries.map((inquiry, index) => (
          <div
            key={inquiry.id}
            onClick={() => onInquiryClick(inquiry.id)}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{inquiry.title}</span>
              {inquiry.status === 'Waiting' ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full shrink-0 ml-2">
                  <ClockIcon className="w-3 h-3" />
                  대기중
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full shrink-0 ml-2">
                  <CheckCircleIcon className="w-3 h-3" />
                  답변완료
                </span>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-500 gap-3">
              <span>No. {getNo(index)}</span>
              {isAdmin && <span>{inquiry.author.name || '-'}</span>}
              <span>{formatDate(inquiry.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
