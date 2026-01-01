import { ReactElement } from 'react';
import { Notice } from '../api/noticeApi';

interface NoticeListProps {
  notices: Notice[];
  onNoticeClick: (id: number) => void;
  isAdmin?: boolean;
}

// 7일 이내 생성된 공지인지 확인
const isNewNotice = (createdAt: string): boolean => {
  const noticeDate = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - noticeDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};

export const NoticeList = ({ notices, onNoticeClick }: NoticeListProps): ReactElement => {
  return (
    <div className="overflow-x-auto">
      {/* 데스크톱 테이블 */}
      <table className="hidden md:table min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
            >
              No
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              제목
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28"
            >
              작성자
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28"
            >
              작성일
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
            >
              조회수
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {notices.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">
                등록된 공지사항이 없습니다.
              </td>
            </tr>
          ) : (
            notices.map((notice) => (
              <tr
                key={notice.id}
                onClick={() => onNoticeClick(notice.id)}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  notice.isPinned ? 'bg-amber-50 hover:bg-amber-100' : ''
                }`}
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {notice.isPinned ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500 text-white rounded-full text-xs">
                      📌
                    </span>
                  ) : (
                    notice.id
                  )}
                </td>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-md">{notice.title}</span>
                    {isNewNotice(notice.createdAt) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                        N
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {notice.author.name || '관리자'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {new Date(notice.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {notice.viewCount}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 모바일 카드 리스트 */}
      <div className="md:hidden divide-y divide-gray-200">
        {notices.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-500 text-sm">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              onClick={() => onNoticeClick(notice.id)}
              className={`p-4 cursor-pointer active:bg-gray-100 transition-colors ${
                notice.isPinned ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {notice.isPinned && (
                  <span className="flex-shrink-0 text-amber-500 text-lg">📌</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{notice.title}</h3>
                    {isNewNotice(notice.createdAt) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                        N
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{notice.author.name || '관리자'}</span>
                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    <span>조회 {notice.viewCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
