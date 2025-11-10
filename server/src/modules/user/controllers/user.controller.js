// web/server/src/modules/user/controllers/user.controller.js
const userService = require('../services/user.service');

// C: 사용자 생성 (회원가입)
exports.createUser = async (req, res) => {
  try {
    const newUser = await userService.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// R: 모든 사용자 조회
exports.getUsers = async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// R: 특정 사용자 조회
exports.getUserById = async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// U: 사용자 정보 수정
exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await userService.update(req.params.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// D: 사용자 삭제
exports.deleteUser = async (req, res) => {
  try {
    await userService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};