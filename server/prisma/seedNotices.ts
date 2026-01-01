// server/prisma/seedNotices.ts
// 공지사항 테스트 데이터 시딩 스크립트
// 실행: npx tsx prisma/seedNotices.ts

/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('📢 공지사항 테스트 데이터 시딩 시작...\n');

  // 관리자 계정 찾기 (공지사항 작성자로 사용)
  const adminUser = await prisma.admin.findFirst({
    include: { user: true },
  });

  if (!adminUser) {
    console.log('❌ 관리자 계정이 없습니다. 기본 시드를 먼저 실행해주세요.');
    console.log('npm run seed');
    return;
  }

  console.log(`✅ 관리자 계정 확인: ${adminUser.user.userEmail}\n`);

  const authorId = adminUser.userId;
  const now = new Date();

  // 다양한 형태의 공지사항 데이터
  const noticeTemplates = [
    // 중요 공지 (고정) - 3개
    {
      title: '[중요] 2026년 1분기 교육 일정 안내',
      content:
        '안녕하세요.\n\n2026년 1분기 교육 일정을 안내드립니다.\n\n1월: 신규 강사 오리엔테이션\n2월: 정기 보수교육\n3월: 특별 워크샵\n\n자세한 일정은 추후 개별 안내 예정입니다.',
      isPinned: true,
      daysAgo: 0,
    },
    {
      title: '[공지] 강사 배정 시스템 업데이트 안내',
      content:
        '강사 배정 시스템이 업데이트되었습니다.\n\n주요 변경사항:\n- 모바일 UI 개선\n- 알림 기능 강화\n- 일정 조회 편의성 향상\n\n문의사항은 관리자에게 연락 바랍니다.',
      isPinned: true,
      daysAgo: 1,
    },
    {
      title: '[필독] 2026년 변경된 교육 가이드라인',
      content:
        '2026년부터 적용되는 새로운 교육 가이드라인을 안내합니다.\n\n1. 교육 시간 변경: 기존 2시간 → 2시간 30분\n2. 교육 자료 업데이트\n3. 평가 방식 개선\n\n첨부된 가이드라인을 반드시 숙지해주세요.',
      isPinned: true,
      daysAgo: 2,
    },

    // 최근 공지 (7일 이내 - NEW 배지 표시) - 7개
    {
      title: '1월 정기 회의 일정 안내',
      content:
        '1월 정기 회의가 다음과 같이 진행됩니다.\n\n일시: 2026년 1월 10일 (금) 14:00\n장소: 본사 대회의실\n안건: 2026년 운영 계획 논의\n\n참석 부탁드립니다.',
      isPinned: false,
      daysAgo: 0,
    },
    {
      title: '신규 강사 환영합니다',
      content:
        '2026년 1월 신규 강사분들을 환영합니다!\n\n김철수, 이영희, 박민수, 최지원 강사님이 새로 합류하셨습니다.\n많은 협조 부탁드립니다.',
      isPinned: false,
      daysAgo: 1,
    },
    {
      title: '교육 자료 업데이트 완료',
      content:
        '2026년 교육 자료가 업데이트되었습니다.\n\n변경된 자료는 자료실에서 다운로드 가능합니다.\n교육 전 반드시 확인해주세요.',
      isPinned: false,
      daysAgo: 2,
    },
    {
      title: '겨울철 안전 교육 안내',
      content:
        '겨울철 도로 상황에 유의하시기 바랍니다.\n\n- 출발 시간 여유있게 설정\n- 미끄러운 도로 주의\n- 차량 점검 필수\n\n안전한 이동 부탁드립니다.',
      isPinned: false,
      daysAgo: 3,
    },
    {
      title: '강사 복지 혜택 안내',
      content:
        '2026년 강사 복지 혜택을 안내드립니다.\n\n1. 교통비 지원 확대\n2. 식비 지원 증가\n3. 교육 수당 인상\n\n자세한 내용은 첨부 파일을 참고해주세요.',
      isPinned: false,
      daysAgo: 4,
    },
    {
      title: '설 연휴 휴무 안내',
      content:
        '2026년 설 연휴 휴무 일정을 안내드립니다.\n\n휴무 기간: 1월 27일(월) ~ 1월 30일(목)\n업무 재개: 1월 31일(금)\n\n즐거운 명절 보내세요!',
      isPinned: false,
      daysAgo: 5,
    },
    {
      title: '교육 평가 양식 변경 안내',
      content:
        '교육 평가 양식이 변경되었습니다.\n\n새로운 양식은 시스템에서 다운로드 가능합니다.\n이전 양식은 더 이상 사용하지 않습니다.',
      isPinned: false,
      daysAgo: 6,
    },

    // 일반 공지 (7일 이상) - 40개
    {
      title: '12월 우수 강사 시상 안내',
      content:
        '12월 우수 강사 시상 결과를 알려드립니다.\n\n대상: 박지훈 강사\n금상: 김미영 강사, 이준혁 강사\n은상: 최수진 강사, 정태윤 강사\n\n축하드립니다!',
      isPinned: false,
      daysAgo: 10,
    },
    {
      title: '동계 특별 교육 프로그램',
      content:
        '동계 특별 교육 프로그램을 안내드립니다.\n\n주제: 창의력 개발 교육\n기간: 1월 15일 ~ 2월 15일\n대상: 희망 강사\n\n참여 신청은 시스템에서 가능합니다.',
      isPinned: false,
      daysAgo: 12,
    },
    {
      title: '교육 장비 점검 안내',
      content:
        '교육 장비 정기 점검이 진행됩니다.\n\n점검 기간: 1월 5일 ~ 1월 7일\n대상: 모든 교육 장비\n\n장비 사용에 불편이 없도록 미리 안내드립니다.',
      isPinned: false,
      daysAgo: 14,
    },
    {
      title: '강사 만족도 조사 결과',
      content:
        '2025년 강사 만족도 조사 결과를 공유합니다.\n\n전체 만족도: 4.5/5.0\n교육 환경: 4.3/5.0\n지원 시스템: 4.6/5.0\n\n소중한 의견 감사합니다.',
      isPinned: false,
      daysAgo: 15,
    },
    {
      title: '부대 주소 변경 안내',
      content:
        '일부 부대의 주소가 변경되었습니다.\n\n- OO부대: 서울시 강남구 → 서울시 서초구\n- XX부대: 경기도 수원시 → 경기도 용인시\n\n교육 시 참고 바랍니다.',
      isPinned: false,
      daysAgo: 18,
    },
    {
      title: '신규 덕목 교육 자료 배포',
      content:
        '신규 덕목 교육 자료가 배포되었습니다.\n\n추가 덕목: 나눔, 봉사\n자료 위치: 자료실 > 덕목교육\n\n교육에 활용해주세요.',
      isPinned: false,
      daysAgo: 20,
    },
    {
      title: '강사 연락처 업데이트 요청',
      content:
        '강사 연락처 정보 업데이트를 요청드립니다.\n\n마이페이지에서 연락처 정보를 확인하시고,\n변경사항이 있으면 수정해주세요.\n\n정확한 연락을 위해 협조 부탁드립니다.',
      isPinned: false,
      daysAgo: 22,
    },
    {
      title: '크리스마스 특별 행사 안내',
      content:
        '크리스마스 특별 행사가 진행되었습니다.\n\n참여해주신 모든 강사분들께 감사드립니다.\n행사 사진은 갤러리에서 확인 가능합니다.',
      isPinned: false,
      daysAgo: 25,
    },
    {
      title: '연말 정산 안내',
      content:
        '2025년 연말 정산 관련 안내입니다.\n\n필요 서류: 급여명세서, 원천징수영수증\n제출 기한: 1월 15일까지\n\n기한 내 제출 부탁드립니다.',
      isPinned: false,
      daysAgo: 28,
    },
    {
      title: '송년회 후기',
      content:
        '2025년 송년회가 성황리에 마무리되었습니다.\n\n참석해주신 모든 분들께 감사드립니다.\n2026년에도 함께 성장해나가요!',
      isPinned: false,
      daysAgo: 30,
    },
    {
      title: '교육 일정 변경 알림',
      content:
        'AA부대 교육 일정이 변경되었습니다.\n\n변경 전: 1월 20일\n변경 후: 1월 25일\n\n해당 강사분들께는 개별 연락드렸습니다.',
      isPinned: false,
      daysAgo: 8,
    },
    {
      title: '강사 보험 가입 안내',
      content:
        '강사 단체 보험 가입 안내입니다.\n\n가입 대상: 전체 강사\n보장 내용: 상해, 배상책임\n\n별도 신청 없이 자동 가입됩니다.',
      isPinned: false,
      daysAgo: 9,
    },
    {
      title: '교통 수당 지급 안내',
      content:
        '12월 교통 수당이 지급되었습니다.\n\n지급일: 1월 5일\n확인: 급여명세서\n\n문의사항은 경리팀으로 연락 바랍니다.',
      isPinned: false,
      daysAgo: 11,
    },
    {
      title: '신규 교육 콘텐츠 개발 참여 모집',
      content:
        '신규 교육 콘텐츠 개발에 참여하실 강사님을 모집합니다.\n\n분야: 디지털 리터러시\n기간: 2월 ~ 3월\n혜택: 개발 수당 지급\n\n관심있는 분은 신청해주세요.',
      isPinned: false,
      daysAgo: 13,
    },
    {
      title: '강사 명함 신청 안내',
      content:
        '강사 명함 신청을 받습니다.\n\n신청 기간: 1월 1일 ~ 1월 15일\n신청 방법: 시스템 통해 신청\n\n필요하신 분은 신청해주세요.',
      isPinned: false,
      daysAgo: 16,
    },
    {
      title: '겨울 건강 관리 팁',
      content:
        '겨울철 건강 관리 팁을 공유합니다.\n\n1. 충분한 수분 섭취\n2. 비타민 보충\n3. 규칙적인 운동\n4. 충분한 휴식\n\n건강한 겨울 보내세요!',
      isPinned: false,
      daysAgo: 17,
    },
    {
      title: '교육 피드백 수렴',
      content:
        '강사분들의 교육 피드백을 수렴합니다.\n\n의견 제출: 1월 10일까지\n제출 방법: 온라인 설문\n\n솔직한 의견 부탁드립니다.',
      isPinned: false,
      daysAgo: 19,
    },
    {
      title: '2025년 교육 실적 정산',
      content:
        '2025년 교육 실적 정산이 완료되었습니다.\n\n개인별 실적은 마이페이지에서 확인 가능합니다.\n문의사항은 관리자에게 연락 바랍니다.',
      isPinned: false,
      daysAgo: 21,
    },
    {
      title: '강사 유니폼 지급 안내',
      content:
        '2026년 강사 유니폼 지급 안내입니다.\n\n지급 시기: 1월 중\n사이즈 확인: 마이페이지\n\n사이즈 변경이 필요하면 연락 바랍니다.',
      isPinned: false,
      daysAgo: 23,
    },
    {
      title: '모바일 앱 업데이트',
      content:
        '모바일 앱이 업데이트되었습니다.\n\n변경사항:\n- 캘린더 기능 개선\n- 알림 기능 추가\n- 버그 수정\n\n앱 스토어에서 업데이트해주세요.',
      isPinned: false,
      daysAgo: 24,
    },
    {
      title: '강사 워크샵 후기',
      content:
        '12월 강사 워크샵이 성공적으로 마무리되었습니다.\n\n참석자: 50명\n주제: 효과적인 교육 방법론\n\n다음 워크샵도 많은 참여 부탁드립니다.',
      isPinned: false,
      daysAgo: 26,
    },
    {
      title: '교육 장소 안내 업데이트',
      content:
        '교육 장소 안내가 업데이트되었습니다.\n\n부대별 교육장 위치, 주차 정보 등이\n시스템에 반영되었습니다.\n\n교육 전 확인 바랍니다.',
      isPinned: false,
      daysAgo: 27,
    },
    {
      title: '강사 커뮤니티 오픈',
      content:
        '강사 전용 온라인 커뮤니티가 오픈되었습니다.\n\n기능: 자료 공유, 질문/답변, 경험 나눔\n접속: 시스템 내 커뮤니티 메뉴\n\n많은 참여 부탁드립니다.',
      isPinned: false,
      daysAgo: 29,
    },
    {
      title: '신년 인사',
      content:
        '2026년 새해 복 많이 받으세요!\n\n올해도 좋은 교육으로 함께해주세요.\n항상 감사드립니다.',
      isPinned: false,
      daysAgo: 1,
    },
    {
      title: '긴급 연락망 업데이트',
      content:
        '긴급 연락망이 업데이트되었습니다.\n\n비상 연락처: 010-xxxx-xxxx\n운영 시간: 24시간\n\n긴급 상황 시 연락 바랍니다.',
      isPinned: false,
      daysAgo: 7,
    },
    {
      title: '교육 일지 작성 안내',
      content:
        '교육 일지 작성에 대해 안내드립니다.\n\n작성 시기: 교육 완료 후 24시간 이내\n작성 방법: 시스템 통해 작성\n\n정확한 기록 부탁드립니다.',
      isPinned: false,
      daysAgo: 32,
    },
    {
      title: '강사 등급 심사 안내',
      content:
        '2026년 1분기 강사 등급 심사가 진행됩니다.\n\n심사 기간: 2월 1일 ~ 2월 15일\n대상: 전체 강사\n\n평소 교육 실적이 반영됩니다.',
      isPinned: false,
      daysAgo: 35,
    },
    {
      title: '교육 자료 저작권 안내',
      content:
        '교육 자료 저작권에 대해 안내드립니다.\n\n모든 교육 자료는 저작권이 있으므로\n무단 복제, 배포를 금지합니다.\n\n협조 부탁드립니다.',
      isPinned: false,
      daysAgo: 38,
    },
    {
      title: '강사 간담회 일정',
      content:
        '2026년 1분기 강사 간담회 일정입니다.\n\n일시: 2월 20일(목) 15:00\n장소: 본사 대회의실\n\n참석 부탁드립니다.',
      isPinned: false,
      daysAgo: 40,
    },
    {
      title: '교육 동영상 촬영 안내',
      content:
        '베스트 교육 사례 동영상 촬영이 진행됩니다.\n\n촬영 대상: 우수 강사\n용도: 신규 강사 교육 자료\n\n해당 강사분께는 개별 연락드립니다.',
      isPinned: false,
      daysAgo: 42,
    },
    {
      title: '시스템 점검 안내',
      content:
        '시스템 정기 점검이 진행됩니다.\n\n점검 시간: 1월 15일 02:00 ~ 06:00\n영향: 일시적 서비스 중단\n\n양해 부탁드립니다.',
      isPinned: false,
      daysAgo: 3,
    },
    {
      title: '강사 추천 프로그램',
      content:
        '강사 추천 프로그램을 운영합니다.\n\n추천 보상: 30만원 상품권\n조건: 추천 강사 3개월 이상 활동 시\n\n좋은 인재 추천 부탁드립니다.',
      isPinned: false,
      daysAgo: 45,
    },
    {
      title: '교육 품질 인증 획득',
      content:
        '우리 교육 프로그램이 품질 인증을 획득했습니다.\n\n인증명: 교육서비스 품질 인증\n인증 기관: 한국교육평가원\n\n모든 강사분들의 노력 덕분입니다. 감사합니다!',
      isPinned: false,
      daysAgo: 48,
    },
    {
      title: '온라인 교육 플랫폼 도입',
      content:
        '온라인 교육 플랫폼이 도입됩니다.\n\n도입 시기: 2월 1일\n용도: 비대면 교육 지원\n\n사용 방법은 추후 안내드리겠습니다.',
      isPinned: false,
      daysAgo: 50,
    },
    {
      title: '강사 헬스케어 프로그램',
      content:
        '강사 헬스케어 프로그램을 시작합니다.\n\n내용: 건강검진, 심리상담\n대상: 희망 강사\n\n신청은 시스템에서 가능합니다.',
      isPinned: false,
      daysAgo: 52,
    },
    {
      title: '교육 효과 분석 결과',
      content:
        '2025년 교육 효과 분석 결과를 공유합니다.\n\n참여 학생 만족도: 92%\n인성 지수 향상률: 15%\n\n우수한 성과에 감사드립니다!',
      isPinned: false,
      daysAgo: 55,
    },
    {
      title: '2025년 연간 보고서 발행',
      content:
        '2025년 연간 보고서가 발행되었습니다.\n\n주요 내용:\n- 교육 실적 통계\n- 강사 활동 현황\n- 향후 계획\n\n자료실에서 확인 가능합니다.',
      isPinned: false,
      daysAgo: 33,
    },
    {
      title: '봄학기 교육 준비 안내',
      content:
        '봄학기 교육 준비에 대해 안내드립니다.\n\n교육 시작: 3월 2일\n준비 사항: 교육 자료 숙지, 장비 점검\n\n미리 준비 부탁드립니다.',
      isPinned: false,
      daysAgo: 36,
    },
    {
      title: '강사 역량 강화 교육',
      content:
        '강사 역량 강화 교육이 진행됩니다.\n\n일시: 2월 첫째 주\n내용: 최신 교육 트렌드, 소통 기법\n\n필수 참석 부탁드립니다.',
      isPinned: false,
      daysAgo: 41,
    },
    {
      title: '교육 일정 확정 공지',
      content:
        '2026년 상반기 교육 일정이 확정되었습니다.\n\n상세 일정은 시스템 캘린더에서 확인 가능합니다.\n변동 사항은 별도 안내드리겠습니다.',
      isPinned: false,
      daysAgo: 44,
    },
  ];

  // 기존 공지사항 삭제 (테스트 데이터 재생성용 - Message 테이블에서 Notice 타입만)
  console.log('🗑️ 기존 공지사항 삭제 중...');
  await prisma.message.deleteMany({ where: { type: 'Notice' } });
  console.log('✅ 기존 공지사항 삭제 완료\n');

  // 공지사항 생성
  console.log('📝 공지사항 생성 중...');
  let pinnedCount = 0;
  let recentCount = 0;
  let normalCount = 0;

  for (const template of noticeTemplates) {
    const createdAt = new Date(now.getTime() - template.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.message.create({
      data: {
        type: 'Notice',
        title: template.title,
        body: template.content,
        isPinned: template.isPinned,
        authorId,
        viewCount: Math.floor(Math.random() * 200) + 1,
        status: 'Sent',
        createdAt,
      },
    });

    if (template.isPinned) {
      pinnedCount++;
      console.log(`  📌 [고정] ${template.title}`);
    } else if (template.daysAgo <= 7) {
      recentCount++;
      console.log(`  🆕 [NEW] ${template.title}`);
    } else {
      normalCount++;
    }
  }

  // 요약
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 공지사항 시딩 결과 요약');
  console.log('='.repeat(50));
  console.log(`총 공지사항: ${noticeTemplates.length}개`);
  console.log(`  - 📌 상단 고정: ${pinnedCount}개`);
  console.log(`  - 🆕 최근 공지 (7일 이내): ${recentCount}개`);
  console.log(`  - 📋 일반 공지: ${normalCount}개`);
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
/* eslint-enable no-console */
