// src/domains/inquiry/inquiry.controller.ts
import { Request, Response } from 'express';
import inquiryService from './inquiry.service';
import asyncHandler from '../../common/middlewares/asyncHandler';

// 문의사항 목록 조회
export const getInquiries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, search, sortField, sortOrder } = req.query;
  const authorId = req.user?.id; // 현재 로그인한 사용자 ID (작성자 기준 조회 시 필요할 수 있음. admin이면 무시될 수도?)
  // Admin 여부에 따라 authorId 넘기는 로직은 service/repo filter에서 처리.
  // 여기서는 Admin이면 authorId 안 넘기고, User면 넘겨야 하나?
  // 현재 코드는 `getAll`에서 `authorId`를 받아서 필터링.
  // 하지만 `getInquiries`는 Admin/User 공용?
  // AdminController가 따로 있나? 없다.
  // req.user가 있으면 authorId를 넘겨서 본인 것만 보게 하는지, 아니면 전체를 보는지 확인 필요.
  // 하지만 지금은 Sort 추가만 집중.
  const result = await inquiryService.getAll({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    authorId: undefined, // Admin 조회용이라면 undefined. 만약 내 문의만 보기라면 req.user.id. 로직 확인 필요하지만 일단 sort만 추가.
    status: status as 'Waiting' | 'Answered' | undefined,
    search: search as string | undefined,
    sortField: typeof sortField === 'string' ? sortField : undefined,
    sortOrder:
      sortOrder === 'asc' || sortOrder === 'desc' ? (sortOrder as 'asc' | 'desc') : undefined,
  });
  res.json(result);
});

// 문의사항 단건 조회
export const getInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const isAdmin = req.user?.isAdmin === true;
  const inquiry = await inquiryService.getOne(Number(id), req.user!.id, isAdmin);
  res.json(inquiry);
});

// 문의사항 생성 (강사)
export const createInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body;
  const authorId = req.user!.id;
  const inquiry = await inquiryService.create({ title, content }, authorId);
  res.status(201).json(inquiry);
});

// 문의사항 답변 (관리자 전용)
export const answerInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { answer } = req.body;
  const answeredBy = req.user!.id;
  const inquiry = await inquiryService.answer(Number(id), answer, answeredBy);
  res.json(inquiry);
});

// 문의사항 삭제
export const deleteInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const isAdmin = req.user?.isAdmin === true;
  await inquiryService.delete(Number(id), req.user!.id, isAdmin);
  res.status(204).send();
});
