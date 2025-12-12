//server/src/domains/instructor/controllers/instructor.controller.js
const instructorService = require('./instructor.service');

// [제거됨] getMe, updateMe -> User 도메인의 /users/me 사용

// [가능 일정 조회]
exports.getAvailability = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) throw new Error('연도(year)와 월(month) 파라미터가 필요합니다.');

    const result = await instructorService.getAvailabilities(req.user.id, Number(year), Number(month));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [가능 일정 수정]
exports.updateAvailability = async (req, res) => {
  try {
    const { year, month, dates } = req.body;
    if (!year || !month || !Array.isArray(dates)) {
      throw new Error('잘못된 요청 데이터입니다.');
    }

    const result = await instructorService.updateAvailabilities(req.user.id, Number(year), Number(month), dates);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
