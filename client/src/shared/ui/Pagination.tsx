import { ReactElement, useState, useEffect } from 'react';

interface PaginationProps {
  totalPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  limit?: number; // 한 번에 보여줄 페이지 번호 개수 (기본 10)
}

export const Pagination = ({
  totalPage,
  currentPage,
  onPageChange,
  limit: initialLimit,
}: PaginationProps): ReactElement => {
  const [limit, setLimit] = useState(initialLimit || 10);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setLimit(5);
      } else {
        setLimit(initialLimit || 10);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialLimit]);
  // 최소 1페이지는 항상 표시
  const effectiveTotalPage = Math.max(totalPage, 1);

  // 현재 페이지가 속한 블록 계산
  // 예: limit=10 일 때, 1~10페이지는 0번 블록, 11~20페이지는 1번 블록
  const currentBlock = Math.ceil(currentPage / limit);
  const startPage = (currentBlock - 1) * limit + 1;
  const endPage = Math.min(startPage + limit - 1, effectiveTotalPage);

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const handlePrevBlock = () => {
    onPageChange(startPage - 1);
  };

  const handleNextBlock = () => {
    onPageChange(endPage + 1);
  };

  return (
    <div className="flex justify-center items-center gap-1 md:gap-2 select-none">
      {/* 이전 블록 이동 (<) */}
      <button
        onClick={handlePrevBlock}
        disabled={startPage === 1}
        className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg border border-gray-200 
                   bg-white text-gray-500 hover:bg-gray-50 hover:text-indigo-600 
                   disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500
                   transition-all duration-200"
        aria-label="Previous pages"
      >
        <svg
          className="w-4 h-4 md:w-5 md:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 페이지 번호들 */}
      <div className="flex items-center gap-1">
        {pages.map((page) => {
          // 실제 데이터가 있는 페이지인지 확인
          const hasData = page <= totalPage;

          return (
            <button
              key={page}
              onClick={() => hasData && onPageChange(page)}
              disabled={!hasData}
              className={`
                flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                    : hasData
                      ? 'bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                      : 'bg-gray-100 text-gray-300 border border-gray-100 cursor-not-allowed'
                }
              `}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* 다음 블록 이동 (>) */}
      <button
        onClick={handleNextBlock}
        disabled={endPage >= effectiveTotalPage}
        className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg border border-gray-200 
                   bg-white text-gray-500 hover:bg-gray-50 hover:text-indigo-600 
                   disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500
                   transition-all duration-200"
        aria-label="Next pages"
      >
        <svg
          className="w-4 h-4 md:w-5 md:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};
