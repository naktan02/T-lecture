// src/domains/notice/notice.controller.ts
import { Request, Response } from 'express';
import noticeService from './notice.service';
import asyncHandler from '../../common/middlewares/asyncHandler';

// 공지사항 목록 조회
export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, sortField, sortOrder } = req.query;
  const result = await noticeService.getAll({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string | undefined,
    sortField: typeof sortField === 'string' ? sortField : undefined,
    sortOrder:
      sortOrder === 'asc' || sortOrder === 'desc' ? (sortOrder as 'asc' | 'desc') : undefined,
    userId: !req.user?.isAdmin ? req.user?.id : undefined,
  });
  res.json(result);
});

// 공지사항 단건 조회
export const getNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notice = await noticeService.getOne(Number(id));
  res.json(notice);
});

// 공지사항 생성 (관리자 전용)
export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, isPinned, targetType, targetTeamIds, targetUserIds } = req.body;
  const authorId = req.user!.id;
  const notice = await noticeService.create(
    { title, content, isPinned, targetType, targetTeamIds, targetUserIds },
    authorId,
  );
  res.status(201).json(notice);
});

// 공지사항 수정 (관리자 전용)
export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, isPinned, targetType, targetTeamIds, targetUserIds } = req.body;
  const notice = await noticeService.update(Number(id), {
    title,
    content,
    isPinned,
    targetType,
    targetTeamIds,
    targetUserIds,
  });
  res.json(notice);
});

// 공지사항 삭제 (관리자 전용)
export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await noticeService.delete(Number(id));
  res.status(204).send();
});

// 공지사항 고정 토글 (관리자 전용)
export const toggleNoticePin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notice = await noticeService.togglePin(Number(id));
  res.json(notice);
});
