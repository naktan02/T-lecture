// web/server/src/modules/user/services/user.service.js
const userRepository = require('../repositories/user.repository');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// (Helper) 응답 객체에서 비밀번호 필드 제거
const omitPassword = (user) => {
  if (user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return user;
};

exports.create = async (userData) => {
  // 1. 비즈니스 로직: 비밀번호 해시
  const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

  // 2. 강사 가입 시 기본 상태는 PENDING (스토리맵 기반)
  const dataToSave = {
    ...userData,
    password: hashedPassword,
    status: 'PENDING', 
    // 'ADMIN'으로 가입 요청 시 처리 (현재는 모두 PENDING)
    role: userData.role || 'INSTRUCTOR', 
  };

  // 3. Repository 호출
  const newUser = await userRepository.create(dataToSave);
  return omitPassword(newUser);
};

exports.findAll = async () => {
  // Repository에서 이미 password를 제외하고 가져옵니다.
  return await userRepository.findAll();
};

exports.findById = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

exports.update = async (id, userData) => {
  // 만약 비밀번호 변경 요청이 있다면, 해시 처리
  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, saltRounds);
  }

  const updatedUser = await userRepository.update(id, userData);
  return omitPassword(updatedUser);
};

exports.delete = async (id) => {
  // 삭제 전 존재 여부 확인
  await this.findById(id); 
  return await userRepository.delete(id);
};