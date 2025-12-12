// src/entities/user/ui/UserListSection.jsx
import React from 'react';

/**
 * 유저 목록을 보여주는 공용 섹션 컴포넌트
 * * @param {string} title - 박스 제목
 * @param {Array} users - 보여줄 유저 데이터 배열
 * @param {string} emptyMessage - 데이터가 없을 때 띄울 메시지
 * @param {function} renderActions - (옵션) 각 행 우측에 버튼 등을 렌더링할 함수
 * @param {function} onRowClick - (옵션) 행 클릭 시 실행할 함수 (user 객체 반환)
 * @param {string} height - (옵션) 리스트 영역의 높이 클래스 (기본값: "max-h-[70vh]")
 */
export const UserListSection = ({ 
    title, 
    users, 
    emptyMessage, 
    renderActions,
    onRowClick,        // [New] 클릭 이벤트
    height = "max-h-[70vh]" // [New] 높이 조절 (기본값)
}) => {
    return (
        <section className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-full">
            {/* 헤더 부분 */}
            <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <span className="font-semibold text-sm">{title}</span>
                <span className="text-xs text-gray-500">{users.length}명</span>
            </div>

            {/* 리스트 부분: height props 적용 */}
            <div className={`flex-1 overflow-y-auto ${height} p-3 space-y-2`}>
                {users.length === 0 && (
                    <div className="text-xs text-gray-400 text-center mt-4">
                        {emptyMessage}
                    </div>
                )}
                
                {users.map((u) => (
                    <div
                        key={u.id}
                        // [New] 클릭 이벤트가 있으면 실행
                        onClick={() => onRowClick && onRowClick(u)}
                        className={`
                            border rounded-md px-3 py-2 text-xs flex justify-between items-center transition-colors
                            ${onRowClick ? "cursor-pointer hover:bg-gray-50 hover:border-blue-300" : "hover:border-gray-400"}
                        `}
                    >
                        {/* 유저 정보 (공통) */}
                        <div>
                            <div className="font-semibold text-gray-800 flex items-center gap-1">
                                {u.name || '이름 없음'}
                                {/* 팀장 뱃지 같은 특수 케이스 처리 */}
                                {u.instructor?.isTeamLeader && (
                                    <span className="text-[10px] text-amber-600 border border-amber-300 rounded px-1">팀장</span>
                                )}
                            </div>
                            <div className="text-gray-500">{u.userEmail}</div>
                            <div className="text-[11px] text-gray-400 mt-1">
                                상태: {u.status} 
                                {u.admin && <span className="ml-1 text-blue-600">({u.admin.level})</span>}
                            </div>
                        </div>

                        {/* 버튼 영역 (가변) - 부모가 결정함 */}
                        <div className="flex flex-col gap-1 items-end" onClick={(e) => e.stopPropagation()}> 
                            {/* e.stopPropagation(): 버튼 누를 땐 onRowClick 발동 안 하게 막음 */}
                            {renderActions && renderActions(u)}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};