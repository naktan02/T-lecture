// src/domains/notice/notice.repository.ts
import prisma from '../../libs/prisma';

interface NoticeCreateData {
  title: string;
  content: string;
  authorId: number;
  isPinned?: boolean;
}

import { Prisma } from '@prisma/client';

interface NoticeFindAllParams {
  skip: number;
  take: number;
  search?: string;
  orderBy?: Prisma.NoticeOrderByWithRelationInput;
}

class NoticeRepository {
  // 공지사항 생성
  async create(data: NoticeCreateData) {
    return await prisma.notice.create({
      data: {
        title: data.title,
        body: data.content,
        authorId: data.authorId,
        isPinned: data.isPinned ?? false,
      },
    });
  }

  // 공지사항 목록 조회 (content 포함)
  async findAll({ skip, take, search, orderBy }: NoticeFindAllParams) {
    const where = search
      ? {
          OR: [{ title: { contains: search } }, { body: { contains: search } }],
        }
      : {};

    // Pinned always on top, then custom sort or default createdAt desc
    const sortRule: Prisma.NoticeOrderByWithRelationInput[] = [{ isPinned: 'desc' }];
    if (orderBy) {
      sortRule.push(orderBy);
    } else {
      sortRule.push({ createdAt: 'desc' });
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        skip,
        take,
        orderBy: sortRule,
        include: {
          author: {
            select: { name: true },
          },
        },
      }),
      prisma.notice.count({ where }),
    ]);
    return { notices, total };
  }

  // 공지사항 단건 조회
  async findById(id: number) {
    return await prisma.notice.findUnique({
      where: { id },
    });
  }

  // 공지사항 수정
  async update(id: number, data: { title?: string; content?: string; isPinned?: boolean }) {
    return await prisma.notice.update({
      where: { id },
      data: {
        title: data.title,
        body: data.content,
        isPinned: data.isPinned,
      },
    });
  }

  // 공지사항 삭제
  async delete(id: number) {
    return await prisma.notice.delete({
      where: { id },
    });
  }

  // 조회수 증가
  async increaseViewCount(id: number) {
    return await prisma.notice.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  // 고정 토글
  async togglePin(id: number) {
    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) return null;
    return await prisma.notice.update({
      where: { id },
      data: { isPinned: !notice.isPinned },
    });
  }

  // 작성자 정보 조회
  async findAuthorById(authorId: number) {
    return await prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });
  }

  // 수신자 Receipt 생성 (전체, 팀, 개인)
  async createReceipts(noticeId: number, userIds: number[]) {
    if (userIds.length === 0) return;

    await prisma.noticeReceipt.createMany({
      data: userIds.map((userId) => ({
        noticeId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  // 전체 승인된 사용자 ID 조회
  async findAllApprovedUserIds(): Promise<number[]> {
    const users = await prisma.user.findMany({
      where: { status: 'APPROVED' },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  // 팀별 사용자 ID 조회
  async findUserIdsByTeamIds(teamIds: number[]): Promise<number[]> {
    const instructors = await prisma.instructor.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    });
    return instructors.map((i) => i.userId);
  }

  // 내 공지사항 목록 조회 (수신자용)
  async findMyNotices(userId: number) {
    return await prisma.noticeReceipt.findMany({
      where: { userId },
      include: {
        notice: true,
      },
      orderBy: { notice: { createdAt: 'desc' } },
    });
  }

  // 공지사항 읽음 처리
  async markAsRead(userId: number, noticeId: number) {
    return await prisma.noticeReceipt.update({
      where: {
        noticeId_userId: {
          noticeId,
          userId,
        },
      },
      data: { readAt: new Date() },
    });
  }
}

export default new NoticeRepository();
