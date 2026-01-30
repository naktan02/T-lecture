// src/pages/legal/PrivacyPage.tsx
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage(): ReactElement {
  const navigate = useNavigate();

  const handleBack = () => {
    // 새 탭에서 열린 경우 (히스토리가 없음) /signup으로 이동
    if (window.history.length <= 1) {
      navigate('/signup');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b">
          <button
            type="button"
            onClick={handleBack}
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
          <h1 className="text-2xl font-bold text-gray-800">개인정보 처리방침</h1>
        </div>

        {/* 방침 내용 */}
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <p className="text-sm text-gray-500">시행일: 2025년 1월 1일</p>

          <p>
            푸른나무재단(이하 "재단")은 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을
            보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은
            처리방침을 두고 있습니다.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제1조 (개인정보의 처리 목적)
            </h2>
            <p>재단은 다음의 목적을 위하여 개인정보를 처리합니다:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>
                <strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 본인 식별·인증, 회원자격
                유지·관리, 서비스 부정이용 방지
              </li>
              <li>
                <strong>서비스 제공:</strong> 강사 배정, 교육 일정 관리, 거리 계산을 위한 위치정보
                활용
              </li>
              <li>
                <strong>민원 처리:</strong> 민원인의 신원 확인, 민원사항 확인, 처리결과 통보
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제2조 (수집하는 개인정보 항목)
            </h2>
            <p>재단은 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">수집 항목</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">수집 목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">필수</td>
                    <td className="border border-gray-300 px-4 py-2">이메일, 비밀번호, 이름, 전화번호</td>
                    <td className="border border-gray-300 px-4 py-2">회원 식별 및 연락</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">강사 필수</td>
                    <td className="border border-gray-300 px-4 py-2">거주지 주소</td>
                    <td className="border border-gray-300 px-4 py-2">부대까지의 거리 계산</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">강사 필수</td>
                    <td className="border border-gray-300 px-4 py-2">위도, 경도 (주소 기반 자동 변환)</td>
                    <td className="border border-gray-300 px-4 py-2">정확한 거리/시간 계산</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">강사 선택</td>
                    <td className="border border-gray-300 px-4 py-2">자차 보유 여부</td>
                    <td className="border border-gray-300 px-4 py-2">배정 시 교통수단 고려</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제3조 (개인정보의 처리 및 보유 기간)
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                재단은 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에
                동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </li>
              <li>
                <strong>회원 정보:</strong> 회원 탈퇴 시까지 (단, 관련 법령에 따라 보존이 필요한
                경우 해당 기간 동안 보관)
              </li>
              <li>
                <strong>배정 기록:</strong> 교육 완료 후 3년 (교육 증빙 및 통계 목적)
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제4조 (개인정보의 제3자 제공)
            </h2>
            <p>
              재단은 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의
              경우에는 예외로 합니다:
            </p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제5조 (개인정보 처리의 위탁)
            </h2>
            <p>재단은 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:</p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">수탁업체</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">카카오</td>
                    <td className="border border-gray-300 px-4 py-2">
                      주소-좌표 변환(지오코딩), 경로 탐색 API
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제6조 (정보주체의 권리·의무 및 행사방법)
            </h2>
            <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ol>
            <p className="mt-2">
              위 권리 행사는 서비스 내 프로필 설정 또는 개인정보 보호책임자에게 서면, 이메일로
              연락하시면 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제7조 (개인정보의 파기)
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                재단은 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
                지체 없이 해당 개인정보를 파기합니다.
              </li>
              <li>
                <strong>파기 방법:</strong> 전자적 파일 형태의 정보는 복구가 불가능한 방법으로
                영구 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제8조 (개인정보의 안전성 확보 조치)
            </h2>
            <p>재단은 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>
                <strong>비밀번호 암호화:</strong> 이용자의 비밀번호는 암호화되어 저장 및 관리됩니다.
              </li>
              <li>
                <strong>해킹 등에 대비한 기술적 대책:</strong> 보안프로그램을 설치하고 주기적인
                갱신·점검을 합니다.
              </li>
              <li>
                <strong>접근 권한 관리:</strong> 개인정보에 대한 접근권한을 최소한의 인원으로
                제한합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제9조 (위치정보의 처리)
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                재단은 강사의 거주지 주소를 위도·경도 좌표로 변환하여 부대까지의 거리 및 소요시간
                계산에 활용합니다.
              </li>
              <li>
                위치정보는 배정 최적화 목적으로만 사용되며, 실시간 위치 추적은 하지 않습니다.
              </li>
              <li>
                강사가 주소를 변경하면 기존 좌표 정보는 새로운 정보로 대체됩니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제10조 (개인정보 보호책임자)
            </h2>
            <p>
              재단은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
              정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를
              지정하고 있습니다.
            </p>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p>
                <strong>개인정보 보호책임자</strong>
              </p>
              <ul className="mt-2 space-y-1">
                <li>담당부서: 푸른나무재단 운영팀</li>
                <li>연락처: (재단 연락처 기입 필요)</li>
                <li>이메일: (재단 이메일 기입 필요)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제11조 (권익침해 구제방법)
            </h2>
            <p>
              이용자는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회,
              한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
            </p>
            <ul className="mt-2 space-y-1">
              <li>개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청: 1301 (www.spo.go.kr)</li>
              <li>경찰청: 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
              제12조 (개인정보 처리방침 변경)
            </h2>
            <p>
              이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가,
              삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여
              고지할 것입니다.
            </p>
          </section>

          <section className="mt-8 pt-4 border-t">
            <p className="text-sm text-gray-500">
              본 개인정보 처리방침은 2025년 1월 1일부터 시행됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
