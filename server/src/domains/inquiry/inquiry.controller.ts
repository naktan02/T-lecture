// src/domains/inquiry/inquiry.controller.ts
import { Request, Response } from 'express';
import inquiryService from './inquiry.service';
import asyncHandler from '../../common/middlewares/asyncHandler';

// 문의사항 목록 조회
export const getInquiries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, search } = req.query;
  const isAdmin = req.user?.isAdmin === true;

  const result = await inquiryService.getAll({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    // 관리자는 전체, 강사는 본인 문의만
    authorId: isAdmin ? undefined : req.user!.id,
    status: status as 'Waiting' | 'Answered' | undefined,
    search: search as string | undefined,
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
