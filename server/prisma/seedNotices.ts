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

    // 일반 공지 (7일 이상) - 15개
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
      title: '시스템 점검 안내',
      content:
        '시스템 정기 점검이 진행됩니다.\n\n점검 시간: 1월 15일 02:00 ~ 06:00\n영향: 일시적 서비스 중단\n\n양해 부탁드립니다.',
      isPinned: false,
      daysAgo: 8,
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
      title: '강사 등급 심사 안내',
      content:
        '2026년 1분기 강사 등급 심사가 진행됩니다.\n\n심사 기간: 2월 1일 ~ 2월 15일\n대상: 전체 강사\n\n평소 교육 실적이 반영됩니다.',
      isPinned: false,
      daysAgo: 35,
    },
    {
      title: '교육 품질 인증 획득',
      content:
        '우리 교육 프로그램이 품질 인증을 획득했습니다.\n\n인증명: 교육서비스 품질 인증\n인증 기관: 한국교육평가원\n\n모든 강사분들의 노력 덕분입니다. 감사합니다!',
      isPinned: false,
      daysAgo: 48,
    },
  ];

  // 기존 공지사항 삭제 (새 Notice 테이블)
  console.log('🗑️ 기존 공지사항 삭제 중...');
  await prisma.notice.deleteMany({});
  console.log('✅ 기존 공지사항 삭제 완료\n');

  // 공지사항 생성
  console.log('📝 공지사항 생성 중...');
  let pinnedCount = 0;
  let recentCount = 0;
  let normalCount = 0;

  for (const template of noticeTemplates) {
    const createdAt = new Date(now.getTime() - template.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.notice.create({
      data: {
        title: template.title,
        body: template.content,
        isPinned: template.isPinned,
        authorId,
        viewCount: Math.floor(Math.random() * 200) + 1,
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
