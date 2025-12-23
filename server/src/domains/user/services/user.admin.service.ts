// server/src/domains/user/services/user.admin.service.ts
import adminRepository from '../repositories/user.admin.repository';
import userRepository from '../repositories/user.repository';
import AppError from '../../../common/errors/AppError';
import { UserStatus, AdminLevel } from '@prisma/client';

const ALLOWED_USER_STATUS = ['PENDING', 'APPROVED', 'RESTING', 'INACTIVE'] as const;

// 파서 boolean
function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

// 응답 객체에서 password와 admin 정보를 제거하고, 강사 정보는 남깁니다.
function mapUserForAdmin(user: any) {
  if (!user) return null;
  const { password, admin, instructor, ...rest } = user;
  if (instructor) {
    return { instructor, ...rest };
  }
  return rest;
}

interface QueryFilters {
  status?: string;
  name?: string;
  role?: string;
  onlyAdmins?: boolean;
  onlyInstructors?: boolean;
}

// querystring을 repo가 이해하는 형태로 변환
function normalizeFilters(query: QueryFilters = {}): QueryFilters {
  const filters: QueryFilters = { ...query };
  if (!filters.status) filters.status = 'APPROVED';
  if (filters.status === 'ALL') delete filters.status;
  if (filters.name !== undefined && filters.name !== null && String(filters.name).trim() === '') {
    delete filters.name;
  }
  const role = (filters.role || '').toString().toUpperCase();
  if (role === 'ADMIN') {
    filters.onlyAdmins = true;
    delete filters.onlyInstructors;
  } else if (role === 'INSTRUCTOR') {
    filters.onlyInstructors = true;
    delete filters.onlyAdmins;
    if (filters.onlyAdmins !== undefined) filters.onlyAdmins = parseBool(filters.onlyAdmins);
    if (filters.onlyInstructors !== undefined)
      filters.onlyInstructors = parseBool(filters.onlyInstructors);
    delete filters.role;

    return filters;
  }
  return filters;
}

// dto 검증
function assertDtoObject(dto: unknown): asserts dto is Record<string, any> {
  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    throw new AppError('요청 바디 형식이 올바르지 않습니다.', 400, 'INVALID_BODY');
  }
}

// dto 검증
function assertStringOrUndefined(value: unknown, fieldName: string): void {
  if (value === undefined) return;
  if (value === null) return;
  if (typeof value !== 'string') {
    throw new AppError(`${fieldName}는 문자열이어야 합니다.`, 400, 'INVALID_INPUT');
  }
}

// dto 검증
function assertValidStatusOrUndefined(status: unknown): void {
  if (status === undefined) return;
  if (typeof status !== 'string') {
    throw new AppError('status는 문자열이어야 합니다.', 400, 'INVALID_STATUS');
  }
  if (!ALLOWED_USER_STATUS.includes(status as any)) {
    throw new AppError(
      `유효하지 않은 status 입니다. allowed: ${ALLOWED_USER_STATUS.join(', ')}`,
      400,
      'INVALID_STATUS',
    );
  }
}

interface UpdateUserDto {
  name?: string;
  phoneNumber?: string;
  status?: string;
  address?: string;
  isTeamLeader?: boolean;
}

class AdminService {
  // 모든 유저 조회
  async getAllUsers(query: QueryFilters) {
    const filters = normalizeFilters(query);
    const users = await adminRepository.findAll(filters);

    return users.map(mapUserForAdmin);
  }

  // 승인 대기 유저 조회
  async getPendingUsers() {
    const users = await adminRepository.findAll({ status: 'PENDING' });
    return users.map(mapUserForAdmin);
  }

  // 단일 유저 조회
  async getUserById(id: number | string) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    return mapUserForAdmin(user);
  }

  // 유저 수정
  async updateUser(id: number | string, dto: UpdateUserDto) {
    assertDtoObject(dto);

    const { name, phoneNumber, status, address, isTeamLeader } = dto;

    assertStringOrUndefined(name, 'name');
    assertStringOrUndefined(phoneNumber, 'phoneNumber');
    assertStringOrUndefined(address, 'address');
    assertValidStatusOrUndefined(status);

    if (isTeamLeader !== undefined && typeof isTeamLeader !== 'boolean') {
      throw new AppError('isTeamLeader는 boolean이어야 합니다.', 400, 'INVALID_INPUT');
    }

    const hasAny =
      name !== undefined ||
      phoneNumber !== undefined ||
      status !== undefined ||
      address !== undefined ||
      isTeamLeader !== undefined;

    if (!hasAny) {
      throw new AppError('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
    }

    const user = await userRepository.findById(id);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    const userData: Record<string, any> = {};
    if (name !== undefined) userData.name = name;
    if (phoneNumber !== undefined) userData.userphoneNumber = phoneNumber;
    if (status !== undefined) userData.status = status;

    const instructorData: Record<string, any> = {};
    const isInstructor = !!user.instructor;

    if (isInstructor) {
      if (address !== undefined) {
        instructorData.location = address;
        instructorData.lat = null;
        instructorData.lng = null;
      }
      if (typeof isTeamLeader === 'boolean') {
        instructorData.isTeamLeader = isTeamLeader;
      }
    }

    const updatedUser = await userRepository.update(id, userData, instructorData);

    return mapUserForAdmin(updatedUser);
  }

  // 유저 삭제
  async deleteUser(id: number | string) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    await userRepository.delete(id);
    return { message: '회원이 삭제되었습니다.' };
  }

  // 유저 승인
  async approveUser(userId: number | string) {
    const updatedUser = await adminRepository.updateUserStatus(userId, UserStatus.APPROVED);

    return {
      message: '승인 처리가 완료되었습니다.',
      user: mapUserForAdmin(updatedUser),
    };
  }

  // 유저 승인(일괄)
  async approveUsersBulk(userIds: number[]) {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('승인할 유저 ID 목록(배열)이 필요합니다.', 400, 'INVALID_INPUT');
    }

    const result = await adminRepository.updateUsersStatusBulk(userIds, UserStatus.APPROVED);

    return {
      message: `${result.count}명의 유저가 승인되었습니다.`,
      count: result.count,
    };
  }

  // 유저 거절
  async rejectUser(userId: number | string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('사용자를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    if (user.status !== 'PENDING') {
      throw new AppError('승인 대기 중인 사용자만 거절할 수 있습니다.', 400, 'INVALID_STATUS');
    }

    await userRepository.delete(userId);
    return { message: '회원가입 요청을 거절하고 데이터를 삭제했습니다.' };
  }

  // 유저 거절(일괄)
  async rejectUsersBulk(userIds: number[]) {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('거절할 유저 ID 목록(배열)이 필요합니다.', 400, 'INVALID_INPUT');
    }

    const result = await adminRepository.deleteUsersBulk(userIds);

    return {
      message: `${result.count}명의 가입 요청을 거절(삭제)했습니다.`,
      count: result.count,
    };
  }

  // 관리자 권한 부여/회수
  async setAdminLevel(userId: number | string, level: string = 'GENERAL') {
    const normalized = (level || 'GENERAL').toString().toUpperCase();
    if (!['GENERAL', 'SUPER'].includes(normalized)) {
      throw new AppError('잘못된 관리자 레벨입니다.', 400, 'INVALID_ADMIN_LEVEL');
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    const admin = await adminRepository.upsertAdmin(userId, normalized as AdminLevel);

    return {
      message: '관리자 권한이 설정되었습니다.',
      userId: Number(userId),
      adminLevel: admin.level,
    };
  }

  // 관리자 권한 회수
  async revokeAdminLevel(userId: number | string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    await adminRepository.removeAdmin(userId);

    return {
      message: '관리자 권한이 해제되었습니다.',
      userId: Number(userId),
    };
  }
}

export default new AdminService();

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new AdminService();
