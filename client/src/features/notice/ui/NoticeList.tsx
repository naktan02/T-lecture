import { ReactElement } from 'react';
import { Notice } from '../api/noticeApi';

interface NoticeListProps {
  notices: Notice[];
  onNoticeClick: (id: number) => void;
  isAdmin?: boolean;
  currentPage?: number;
  totalCount?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

const NoticeUnreadMarker = (): ReactElement => (
  <span
    className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500"
    aria-label="Unread notice"
    title="읽지 않은 공지"
  />
);

export const NoticeList = ({
  notices,
  onNoticeClick,
  isAdmin = false,
  currentPage = 1,
  totalCount = 0,
  pageSize = 10,
  sortField,
  sortOrder,
  onSort,
}: NoticeListProps): ReactElement => {
  // NO 번호 계산: 최신 글이 가장 높은 번호
  const getNoticeNumber = (index: number): number => {
    // 전체 개수에서 (현재 페이지-1) * 페이지크기 + index를 뺀 값
    return totalCount - ((currentPage - 1) * pageSize + index);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1 text-xs">⇅</span>;
    return sortOrder === 'asc' ? (
      <span className="text-blue-600 ml-1">↑</span>
    ) : (
      <span className="text-blue-600 ml-1">↓</span>
    );
  };

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
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort?.('title')}
            >
              제목 {getSortIcon('title')}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100"
              onClick={() => onSort?.('author')}
            >
              작성자 {getSortIcon('author')}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100"
              onClick={() => onSort?.('createdAt')}
            >
              작성일 {getSortIcon('createdAt')}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
              onClick={() => onSort?.('viewCount')}
            >
              조회수 {getSortIcon('viewCount')}
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
            notices.map((notice, index) =>
              (() => {
                const attachmentCount = notice.attachments?.length ?? 0;
                const showUnreadMarker = !isAdmin && notice.isRead === false;

                return (
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
                        getNoticeNumber(index)
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {showUnreadMarker && <NoticeUnreadMarker />}
                        <span className="block max-w-md truncate">{notice.title}</span>
                        {attachmentCount > 0 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                            첨부 {attachmentCount}
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
                );
              })(),
            )
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
          notices.map((notice, index) =>
            (() => {
              const attachmentCount = notice.attachments?.length ?? 0;
              const showUnreadMarker = !isAdmin && notice.isRead === false;

              return (
                <div
                  key={notice.id}
                  onClick={() => onNoticeClick(notice.id)}
                  className={`p-4 cursor-pointer active:bg-gray-100 transition-colors ${
                    notice.isPinned ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 text-gray-400 text-sm min-w-[24px]">
                      {notice.isPinned ? '📌' : getNoticeNumber(index)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        {showUnreadMarker && <NoticeUnreadMarker />}
                        <h3 className="truncate text-sm font-medium text-gray-900">
                          {notice.title}
                        </h3>
                        {attachmentCount > 0 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            첨부 {attachmentCount}
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
              );
            })(),
          )
        )}
      </div>
    </div>
  );
};
