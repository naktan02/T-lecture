// web/server/src/domains/user/controllers/admin.controller.js
const adminService = require('../../user/services/user.admin.service');

// [신규] 전체 유저 목록 조회 (검색/필터)
exports.getUsers = async (req, res) => {
  try {
    // req.query: { role, status, name } 등
    const users = await adminService.getAllUsers(req.query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [기존] 승인 대기 목록 조회
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await adminService.getPendingUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [신규] 특정 유저 상세 조회
exports.getUserById = async (req, res) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// [신규] 유저 정보 수정
exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await adminService.updateUser(req.params.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [신규] 유저 삭제
exports.deleteUser = async (req, res) => {
  try {
    const result = await adminService.deleteUser(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [기존] 유저 승인
exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body; // (선택)
    const result = await adminService.approveUser(userId, role);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [기존] 일괄 승인
exports.approveUsersBulk = async (req, res) => {
  try {
    const { userIds } = req.body;
    const result = await adminService.approveUsersBulk(userIds);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [기존] 유저 승인 거절
exports.rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await adminService.rejectUser(userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [기존] 일괄 거절
exports.rejectUsersBulk = async (req, res) => {
  try {
    const { userIds } = req.body;
    const result = await adminService.rejectUsersBulk(userIds);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.setAdminLevel = async (req, res) => {
  try {
    const { userId } = req.params;
    const { level } = req.body; // "GENERAL" | "SUPER"
    const result = await adminService.setAdminLevel(userId, level || 'GENERAL');
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.revokeAdminLevel = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await adminService.revokeAdminLevel(userId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};