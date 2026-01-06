// server/prisma/seedNotices.ts
// 공지사항 500개 생성
// 실행: npx tsx prisma/seedNotices.ts

/* eslint-disable no-console */

import prisma from '../src/libs/prisma.js';

// 공지사항 제목 템플릿
const NOTICE_TITLES = [
  '[중요] 2026년 1분기 교육 일정 안내',
  '[공지] 강사 배정 시스템 업데이트 안내',
  '[필독] 변경된 교육 가이드라인',
  '정기 회의 일정 안내',
  '신규 강사 환영합니다',
  '교육 자료 업데이트 완료',
  '겨울철 안전 교육 안내',
  '강사 복지 혜택 안내',
  '설 연휴 휴무 안내',
  '교육 평가 양식 변경 안내',
  '우수 강사 시상 안내',
  '특별 교육 프로그램 안내',
  '교육 장비 점검 안내',
  '강사 만족도 조사 결과',
  '부대 주소 변경 안내',
  '신규 덕목 교육 자료 배포',
  '강사 연락처 업데이트 요청',
  '특별 행사 안내',
  '연말 정산 안내',
  '시스템 점검 안내',
  '긴급 연락망 업데이트',
  '강사 등급 심사 안내',
  '교육 품질 인증 획득',
  '월간 교육 현황 보고',
  '안전 수칙 준수 안내',
];

// 공지사항 내용 템플릿
const NOTICE_CONTENTS = [
  '안녕하세요.\n\n중요한 공지사항을 전달드립니다.\n\n자세한 내용은 아래를 확인해주시기 바랍니다.\n\n감사합니다.',
  '안녕하세요.\n\n금번 업데이트 내용을 안내드립니다.\n\n주요 변경사항:\n- 기능 개선\n- 성능 최적화\n- 버그 수정\n\n문의사항은 관리자에게 연락 바랍니다.',
  '안녕하세요.\n\n새로운 가이드라인을 안내드립니다.\n\n모든 강사분들께서는 반드시 숙지해주시기 바랍니다.\n\n감사합니다.',
  '안녕하세요.\n\n다음과 같이 일정을 안내드립니다.\n\n참석 부탁드립니다.\n\n감사합니다.',
  '안녕하세요.\n\n신규 강사분들을 환영합니다.\n\n많은 협조 부탁드립니다.\n\n감사합니다.',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function runSeedNotices() {
  console.log('📢 공지사항 500개 생성 시작...\n');

  // 관리자 조회
  const admin = await prisma.admin.findFirst({
    include: { user: true },
  });

  if (!admin) {
    console.error('❌ 관리자 계정이 없습니다. seedCore.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📋 작성자: ${admin.user.name} (${admin.user.userEmail})`);

  // 팀 조회
  const teams = await prisma.team.findMany();
  console.log(`📋 팀 ${teams.length}개 로드됨`);

  // 전체 승인된 유저 조회
  const allUsers = await prisma.user.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
  });
  console.log(`📋 승인된 유저 ${allUsers.length}명 로드됨`);

  // 팀별 유저 조회
  const usersByTeam = new Map<number, number[]>();
  for (const team of teams) {
    const teamUsers = await prisma.instructor.findMany({
      where: { teamId: team.id },
      select: { userId: true },
    });
    usersByTeam.set(
      team.id,
      teamUsers.map((u) => u.userId),
    );
  }

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 분포: 전체 50%, 팀 30%, 개인 20%
  const targetDistribution = [
    { type: 'all', count: 250 },
    { type: 'team', count: 150 },
    { type: 'individual', count: 100 },
  ];

  let pinnedCount = 0;
  let totalCreated = 0;

  for (const { type, count } of targetDistribution) {
    console.log(`\n📝 ${type} 공지 ${count}개 생성 중...`);

    for (let i = 0; i < count; i++) {
      const title = randomChoice(NOTICE_TITLES) + ` #${totalCreated + 1}`;
      const content = randomChoice(NOTICE_CONTENTS);

      // 상단 고정 (전체 공지 중 처음 10개만)
      const isPinned = type === 'all' && i < 10;
      if (isPinned) pinnedCount++;

      // 작성일 (최근 6개월 랜덤)
      const daysAgo = randomInt(0, 180);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      try {
        const notice = await prisma.notice.create({
          data: {
            title: title,
            body: content,
            authorId: admin.userId,
            viewCount: randomInt(1, 500),
            isPinned: isPinned,
            createdAt: createdAt,
          },
        });

        // 수신자 지정
        let recipientIds: number[] = [];

        if (type === 'all') {
          recipientIds = allUsers.map((u) => u.id);
        } else if (type === 'team') {
          const team = randomChoice(teams);
          recipientIds = usersByTeam.get(team.id) || [];
        } else {
          // 개인: 랜덤 1~5명
          const shuffled = [...allUsers].sort(() => Math.random() - 0.5);
          recipientIds = shuffled.slice(0, randomInt(1, 5)).map((u) => u.id);
        }

        // NoticeReceipt 생성
        for (const userId of recipientIds) {
          // 읽음 처리 (확률 기반)
          let readAt: Date | null = null;
          const readProbability = type === 'all' ? 0.65 : type === 'team' ? 0.45 : 0.35;
          if (Math.random() < readProbability) {
            readAt = new Date(createdAt.getTime() + randomInt(1, 72) * 60 * 60 * 1000);
          }

          try {
            await prisma.noticeReceipt.create({
              data: {
                noticeId: notice.id,
                userId: userId,
                readAt: readAt,
              },
            });
          } catch {
            // 중복 무시
          }
        }

        totalCreated++;
      } catch (error: any) {
        console.error(`  ❌ 생성 실패: ${title}`, error.message);
      }

      if (totalCreated % 100 === 0) {
        console.log(`  📊 ${totalCreated}/500 공지사항 생성...`);
      }
    }
  }

  console.log(`\n✅ 공지사항 생성 완료!`);
  console.log('='.repeat(50));
  console.log(`📊 생성 결과:`);
  console.log(`  - 전체 공지: 250개`);
  console.log(`  - 팀별 공지: 150개`);
  console.log(`  - 개인 공지: 100개`);
  console.log(`  - 상단 고정: ${pinnedCount}개`);
  console.log('='.repeat(50));
}

// 직접 실행 시
if (require.main === module) {
  runSeedNotices()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
