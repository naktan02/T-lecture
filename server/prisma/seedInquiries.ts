// server/prisma/seedInquiries.ts
// 문의사항 100개 생성
// 실행: npx tsx prisma/seedInquiries.ts

/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 문의사항 제목 템플릿
const INQUIRY_TITLES = [
  '배정 일정 변경 문의드립니다',
  '교통비 정산 관련 문의',
  '교육 자료 관련 문의',
  '출장 일정 조정 가능한가요?',
  '강의 시간 변경 요청',
  '휴가 신청 방법 문의',
  '부대 위치 확인 부탁드려요',
  '동료 강사 연락처 문의',
  '시스템 오류 문의',
  '계정 관련 문의사항',
  '교육 일정 확인 요청',
  '증빙서류 발급 문의',
  '배정 취소 요청',
  '일정 겹침 문제 문의',
  '교육 장소 문의',
  '급여 관련 문의',
  '보수교육 일정 문의',
  '강사 등급 변경 문의',
  '팀 변경 요청',
  '개인정보 수정 요청',
];

// 문의 내용 템플릿
const INQUIRY_CONTENTS = [
  '안녕하세요. 다음 주 배정된 일정에 개인 사정이 생겨서 변경이 가능한지 문의드립니다. 가능하다면 다다음 주로 조정 부탁드려요.',
  '지난달 출장 교통비 정산이 아직 안 됐는데 확인 부탁드립니다. 영수증은 이미 제출했습니다.',
  '이번 교육에 사용할 자료가 업데이트 되었다고 들었는데, 어디서 받을 수 있나요?',
  '특정 기간에 개인 일정이 있어서 해당 기간 배정을 피해주실 수 있을까요?',
  '오전 교육으로 배정되어 있는데, 오후로 변경 가능한지 문의드립니다.',
  '연차 휴가를 사용하려면 어떻게 신청해야 하나요?',
  '다음 주 배정된 부대 주소가 정확한지 확인 부탁드려요. 네비게이션에 나오지 않네요.',
  '같이 배정된 동료 강사분의 연락처를 알 수 있을까요? 사전에 미팅이 필요할 것 같습니다.',
  '앱에서 일정 확인이 안 되는 오류가 있습니다. 확인 부탁드려요.',
  '비밀번호를 잊어버렸는데 재설정 방법을 알려주세요.',
];

// 답변 템플릿
const ANSWERS = [
  '안녕하세요. 요청하신 일정 변경 처리 완료했습니다. 시스템에서 확인해주세요.',
  '정산 처리 완료되었습니다. 익월 말일에 입금될 예정입니다.',
  '최신 자료는 공지사항에 첨부파일로 올려두었습니다. 확인 부탁드려요.',
  '해당 기간 배정 제외 처리했습니다. 감사합니다.',
  '오후 시간으로 변경 완료했습니다.',
  '시스템 내 "휴가 신청" 메뉴에서 신청 가능합니다.',
  '주소 재확인 결과 정확합니다. 부대 정문 앞에서 연락주시면 안내드리겠습니다.',
  '개인정보 보호상 연락처는 공유가 어렵습니다. 부대 도착 후 현장에서 만나시면 됩니다.',
  '확인 결과 서버 점검 중이었습니다. 현재는 정상 작동합니다.',
  '비밀번호 재설정 링크를 이메일로 발송했습니다.',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function runSeedInquiries() {
  console.log('❓ 문의사항 100개 생성 시작...\n');

  // 관리자 조회
  const admin = await prisma.admin.findFirst({
    include: { user: true },
  });

  if (!admin) {
    console.error('❌ 관리자 계정이 없습니다. seedCore.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📋 답변자: ${admin.user.name} (${admin.user.userEmail})`);

  // 강사 조회
  const instructors = await prisma.user.findMany({
    where: {
      instructor: { isNot: null },
      status: 'APPROVED',
    },
    take: 90,
  });

  if (instructors.length === 0) {
    console.error('❌ 강사 데이터가 없습니다. seedUsers.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📋 강사 ${instructors.length}명 로드됨\n`);

  const now = new Date();
  let answeredCount = 0;
  let waitingCount = 0;

  // 80개 답변 완료, 20개 대기
  for (let i = 0; i < 100; i++) {
    const isAnswered = i < 80;
    const author = randomChoice(instructors);
    const title = randomChoice(INQUIRY_TITLES);
    const content = randomChoice(INQUIRY_CONTENTS);

    // 작성일 (최근 30일)
    const daysAgo = randomInt(0, 30);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    try {
      await prisma.inquiry.create({
        data: {
          title: `${title} #${i + 1}`,
          body: content,
          authorId: author.id,
          status: isAnswered ? 'Answered' : 'Waiting',
          ...(isAnswered && {
            answer: randomChoice(ANSWERS),
            answeredBy: admin.userId,
            answeredAt: new Date(createdAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000),
          }),
          createdAt: createdAt,
        },
      });

      if (isAnswered) {
        answeredCount++;
      } else {
        waitingCount++;
      }

      const statusLabel = isAnswered ? '✅답변완료' : '⏳대기중';
      if ((i + 1) % 20 === 0) {
        console.log(`  📊 ${i + 1}/100 문의사항 생성... (마지막: ${statusLabel})`);
      }
    } catch (error: any) {
      console.error(`  ❌ 생성 실패: ${title}`, error.message);
    }
  }

  console.log(`\n✅ 문의사항 생성 완료!`);
  console.log('='.repeat(50));
  console.log(`📊 생성 결과:`);
  console.log(`  - 답변 완료: ${answeredCount}개`);
  console.log(`  - 대기 중: ${waitingCount}개`);
  console.log('='.repeat(50));
}

// 직접 실행 시
if (require.main === module) {
  runSeedInquiries()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
