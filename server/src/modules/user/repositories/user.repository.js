// web/server/src/modules/user/repositories/user.repository.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 응답 시 제외할 필드 정의 (보안)
const userSelectOptions = {
  id: true,
  email: true,
  name: true,
  contactNumber: true,
  address: true,
  addressLat: true,
  addressLng: true,
  hasCar: true,
  role: true,
  instructorType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

exports.create = async (userData) => {
  return await prisma.user.create({
    data: userData,
  });
};

exports.findAll = async () => {
  return await prisma.user.findMany({
    select: userSelectOptions,
  });
};

exports.findById = async (id) => {
  return await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: userSelectOptions,
  });
};

exports.update = async (id, userData) => {
  return await prisma.user.update({
    where: { id: parseInt(id) },
    data: userData,
  });
};

exports.delete = async (id) => {
  return await prisma.user.delete({
    where: { id: parseInt(id) },
  });
};

// (로그인 시 사용) 비밀번호 포함하여 이메일로 찾기
exports.findByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};