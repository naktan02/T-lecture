// src/pages/legal/TermsPage.tsx
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage(): ReactElement {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="뒤로가기"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">서비스 이용약관</h1>
        </div>

        {/* 약관 내용 */}
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <p className="text-sm text-gray-500">시행일: 2025년 1월 1일</p>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 푸른나무재단(이하 "재단")이 운영하는 강사 배정 관리 시스템(이하 "서비스")의
              이용과 관련하여 재단과 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                "서비스"란 재단이 제공하는 군부대 인성교육 강사 배정 및 관리를 위한 웹 기반
                플랫폼을 말합니다.
              </li>
              <li>
                "이용자"란 본 약관에 따라 서비스를 이용하는 강사, 관리자 및 일반 회원을 말합니다.
              </li>
              <li>"강사"란 재단에 등록되어 인성교육을 수행하는 자를 말합니다.</li>
              <li>"관리자"란 재단 소속으로 서비스 운영 권한을 가진 자를 말합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제3조 (약관의 효력)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.</li>
              <li>
                재단은 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수
                있습니다.
              </li>
              <li>
                약관이 개정되는 경우 재단은 개정 내용과 시행일을 명시하여 서비스 내 공지사항을
                통해 시행일 7일 전부터 공지합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제4조 (회원가입)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                이용자는 본 약관에 동의하고 회원가입 양식에 따라 정보를 기입한 후 가입 신청을
                합니다.
              </li>
              <li>
                강사 회원의 경우, 관리자의 승인 절차를 거쳐 회원 자격이 부여됩니다.
              </li>
              <li>
                이용자는 가입 시 제공한 정보에 변경이 있는 경우 즉시 수정하여야 합니다.
              </li>
              <li>
                허위 정보를 기재하거나 타인의 정보를 도용한 경우 서비스 이용이 제한될 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제5조 (서비스의 제공)</h2>
            <p>재단은 다음과 같은 서비스를 제공합니다:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>강사 일정 관리 및 가용일 등록</li>
              <li>군부대 교육 일정 배정</li>
              <li>배정 수락/거절 처리</li>
              <li>공지사항 및 문의 기능</li>
              <li>교육 현황 및 통계 조회</li>
              <li>기타 재단이 정하는 서비스</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제6조 (강사의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>강사는 정확한 가용일 정보를 등록하고 관리하여야 합니다.</li>
              <li>
                배정된 교육에 대해 정당한 사유 없이 거절하거나 불참할 경우 패널티가 부과될 수
                있습니다.
              </li>
              <li>
                강사는 배정 요청에 대해 지정된 기한 내에 수락 또는 거절 의사를 표시하여야 합니다.
              </li>
              <li>
                강사는 교육 수행 시 재단의 교육 지침과 품질 기준을 준수하여야 합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제7조 (패널티 규정)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                정당한 사유 없이 배정을 거절하는 경우 패널티가 누적됩니다.
              </li>
              <li>
                패널티가 누적되면 일정 기간 동안 배정 우선순위가 낮아질 수 있습니다.
              </li>
              <li>
                부대 사정으로 인한 배정 취소의 경우 강사에게 우선배정 크레딧이 부여됩니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제8조 (서비스 이용 제한)</h2>
            <p>재단은 다음의 경우 사전 통보 없이 서비스 이용을 제한할 수 있습니다:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>타인의 개인정보를 도용한 경우</li>
              <li>서비스 운영을 고의로 방해한 경우</li>
              <li>재단 또는 타 이용자의 명예를 손상시킨 경우</li>
              <li>기타 관련 법령이나 본 약관을 위반한 경우</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제9조 (회원 탈퇴)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                이용자는 언제든지 관리자에게 탈퇴를 요청할 수 있으며, 재단은 즉시 회원 탈퇴를
                처리합니다.
              </li>
              <li>
                탈퇴 시 이용자의 개인정보는 개인정보 처리방침에 따라 처리됩니다.
              </li>
              <li>
                진행 중인 배정이 있는 경우 해당 배정 완료 후 탈퇴가 처리될 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제10조 (면책조항)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                재단은 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 서비스를
                제공할 수 없는 경우 책임을 지지 않습니다.
              </li>
              <li>
                재단은 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.
              </li>
              <li>
                재단은 이용자가 서비스를 통해 기대하는 수익을 얻지 못한 것에 대해 책임을 지지
                않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">제11조 (분쟁 해결)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                본 약관에 명시되지 않은 사항은 관련 법령 및 재단의 정책에 따릅니다.
              </li>
              <li>
                서비스 이용과 관련하여 분쟁이 발생한 경우 재단의 소재지를 관할하는 법원을
                전속관할로 합니다.
              </li>
            </ol>
          </section>

          <section className="mt-8 pt-4 border-t">
            <p className="text-sm text-gray-500">
              본 약관은 2025년 1월 1일부터 시행됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
