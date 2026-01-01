import { Request, Response, NextFunction } from 'express';
import noticeService from './notice.service';

class NoticeController {
  createNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, content, isPinned } = req.body;
      const authorId = req.user?.id;
      if (!authorId) throw new Error('User ID missing');

      const notice = await noticeService.createNotice({ title, content, isPinned }, authorId);
      res.status(201).json(notice);
    } catch (error) {
      next(error);
    }
  };

  getNotices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = req.query.search as string | undefined;
      const result = await noticeService.getNotices({ page, limit, search });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const notice = await noticeService.getNotice(id);
      res.status(200).json(notice);
    } catch (error) {
      next(error);
    }
  };

  updateNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const { title, content, isPinned } = req.body;
      const notice = await noticeService.updateNotice(id, { title, content, isPinned });
      res.status(200).json(notice);
    } catch (error) {
      next(error);
    }
  };

  deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      await noticeService.deleteNotice(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  togglePin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const notice = await noticeService.togglePin(id);
      res.status(200).json(notice);
    } catch (error) {
      next(error);
    }
  };
}

export default new NoticeController();
