// server/src/domains/user/services/user.me.service.ts
import userRepository from '../repositories/user.repository';
import AppError from '../../../common/errors/AppError';
import { Prisma } from '@prisma/client';

interface UpdateProfileDto {
  name?: string;
  phoneNumber?: string;
  address?: string;
}

class UserMeService {
  // 내 프로필 조회 (관리자 포함 모든 유저 공용)
  async getMyProfile(userId: number | string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    const { password: _password, ...profile } = user;
    // instructor가 null이면 응답에서 제외
    const { instructor, ...rest } = profile;
    if (instructor) {
      return { ...rest, instructor };
    }
    return rest;
  }

  // 내 프로필 수정
  async updateMyProfile(userId: number | string, dto: UpdateProfileDto) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      throw new AppError('요청 바디 형식이 올바르지 않습니다.', 400, 'INVALID_BODY');
    }

    const { name, phoneNumber, address } = dto;

    if (name !== undefined && name !== null && typeof name !== 'string') {
      throw new AppError('name은 문자열이어야 합니다.', 400, 'INVALID_NAME');
    }

    if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== 'string') {
      throw new AppError('phoneNumber는 문자열이어야 합니다.', 400, 'INVALID_PHONE_NUMBER');
    }

    if (address !== undefined && address !== null && typeof address !== 'string') {
      throw new AppError('address는 문자열이어야 합니다.', 400, 'INVALID_ADDRESS');
    }

    const hasAnyField = name !== undefined || phoneNumber !== undefined || address !== undefined;

    if (!hasAnyField) {
      throw new AppError('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    const userData: Prisma.UserUpdateInput = {};
    if (name !== undefined) userData.name = name;
    if (phoneNumber !== undefined) userData.userphoneNumber = phoneNumber;

    const instructorData: Prisma.InstructorUpdateInput = {};
    const isInstructor = !!user.instructor;

    if (isInstructor && address !== undefined) {
      instructorData.location = address;
      instructorData.lat = null;
      instructorData.lng = null;
    }

    const updatedUser = await userRepository.update(userId, userData, instructorData);

    const { password: _password, ...result } = updatedUser;
    // instructor가 null이면 응답에서 제외
    const { instructor, ...restResult } = result;
    if (instructor) {
      return { ...restResult, instructor };
    }
    return restResult;
  }

  // 회원 탈퇴 (내 계정 삭제)
  async withdraw(userId: number | string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    await userRepository.delete(userId);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}

export default new UserMeService();

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new UserMeService();
