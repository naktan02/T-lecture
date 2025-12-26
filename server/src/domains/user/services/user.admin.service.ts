import adminRepository from '../repositories/user.admin.repository';
import userRepository from '../repositories/user.repository';
import AppError from '../../../common/errors/AppError';
import {
  UserStatus,
  AdminLevel,
  Prisma,
  User,
  Instructor,
  Admin,
  UserCategory,
} from '@prisma/client';

const ALLOWED_USER_STATUS = ['PENDING', 'APPROVED', 'RESTING', 'INACTIVE'] as const;

// 파서 boolean
function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

// 응답 객체에서 password와 admin 정보를 제거하고, 강사 정보는 남깁니다.
type UserWithRelations = User & { instructor?: Instructor | null; admin?: Admin | null };

function mapUserForAdmin(user: UserWithRelations | null) {
  if (!user) return null;
  const { password: _password, admin, instructor, ...rest } = user;
  // admin 정보도 함께 반환하여 클라이언트가 관리자 여부를 판단할 수 있도록 함
  return { ...rest, instructor: instructor || null, admin: admin || null };
}

interface QueryFilters {
  status?: string;
  name?: string;
  role?: string;
  onlyAdmins?: boolean;
  onlyInstructors?: boolean;
}

interface RepoFilters {
  status?: UserStatus;
  name?: string;
  onlyAdmins?: boolean;
  onlyInstructors?: boolean;
  onlyNormal?: boolean;
  teamId?: number;
  category?: UserCategory;
  availableOn?: string;
}

// querystring을 repo가 이해하는 형태로 변환
function normalizeFilters(
  query: QueryFilters & {
    teamId?: string | number;
    category?: string;
    availableOn?: string;
  } = {},
): RepoFilters {
  const filters: RepoFilters = {};

  // status 처리: 'ALL'이면 필터 없음, 없으면 모든 상태 조회
  if (query.status && query.status !== 'ALL') {
    filters.status = query.status as UserStatus;
  }

  // name 처리
  if (query.name !== undefined && query.name !== null && String(query.name).trim() !== '') {
    filters.name = query.name;
  }

  // role 처리
  const role = (query.role || '').toString().toUpperCase();
  if (role === 'ADMIN') {
    filters.onlyAdmins = true;
  } else if (role === 'INSTRUCTOR') {
    filters.onlyInstructors = true;
  } else if (role === 'NORMAL') {
    filters.onlyNormal = true;
  }

  // 팀 필터
  if (query.teamId) {
    filters.teamId = Number(query.teamId);
  }

  // 카테고리 필터
  if (query.category && ['Main', 'Co', 'Assistant', 'Practicum'].includes(query.category)) {
    filters.category = query.category as UserCategory;
  }

  // 근무 가능일 필터
  if (query.availableOn) {
    filters.availableOn = query.availableOn;
  }

  return filters;
}

// dto 검증
function assertDtoObject(dto: unknown): asserts dto is Record<string, unknown> {
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
  if (!ALLOWED_USER_STATUS.includes(status as (typeof ALLOWED_USER_STATUS)[number])) {
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
  // 관리자 직접 관리 필드 (강사용)
  category?: 'Main' | 'Co' | 'Assistant' | 'Practicum';
  teamId?: number | null;
  generation?: number | null;
  restrictedArea?: string | null;
}

interface PaginationQuery extends QueryFilters {
  page?: number | string;
  limit?: number | string;
}

class AdminService {
  // 모든 유저 조회 (페이지네이션 지원)
  async getAllUsers(query: PaginationQuery) {
    const filters = normalizeFilters(query);
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) : query.page || 1;
    const limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : query.limit || 20;

    const result = await adminRepository.findAll(filters, page, limit);

    return {
      data: result.data.map(mapUserForAdmin),
      meta: result.meta,
    };
  }

  // 승인 대기 유저 조회 (페이지네이션 없음 - 기존 호환)
  async getPendingUsers() {
    const users = await adminRepository.findAllWithoutPagination({ status: 'PENDING' });
    return users.map(mapUserForAdmin);
  }

  // 단일 유저 조회 (모든 연관 데이터 포함)
  async getUserById(id: number | string) {
    const user = await userRepository.findByIdWithDetails(id);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    return mapUserForAdmin(user);
  }

  // 유저 수정
  async updateUser(id: number | string, dto: UpdateUserDto) {
    assertDtoObject(dto);

    const {
      name,
      phoneNumber,
      status,
      address,
      isTeamLeader,
      category,
      teamId,
      generation,
      restrictedArea,
    } = dto;

    assertStringOrUndefined(name, 'name');
    assertStringOrUndefined(phoneNumber, 'phoneNumber');
    assertStringOrUndefined(address, 'address');
    assertValidStatusOrUndefined(status);
    if (
      restrictedArea !== undefined &&
      restrictedArea !== null &&
      typeof restrictedArea !== 'string'
    ) {
      throw new AppError('restrictedArea는 문자열이어야 합니다.', 400, 'INVALID_INPUT');
    }

    if (isTeamLeader !== undefined && typeof isTeamLeader !== 'boolean') {
      throw new AppError('isTeamLeader는 boolean이어야 합니다.', 400, 'INVALID_INPUT');
    }

    const validCategories = ['Main', 'Co', 'Assistant', 'Practicum'] as const;
    if (
      category !== undefined &&
      !validCategories.includes(category as (typeof validCategories)[number])
    ) {
      throw new AppError('잘못된 강사 분류입니다.', 400, 'INVALID_CATEGORY');
    }

    if (
      teamId !== undefined &&
      teamId !== null &&
      (typeof teamId !== 'number' || !Number.isInteger(teamId))
    ) {
      throw new AppError('teamId는 정수여야 합니다.', 400, 'INVALID_TEAM_ID');
    }

    if (
      generation !== undefined &&
      generation !== null &&
      (typeof generation !== 'number' || !Number.isInteger(generation))
    ) {
      throw new AppError('generation은 정수여야 합니다.', 400, 'INVALID_GENERATION');
    }

    const hasAny =
      name !== undefined ||
      phoneNumber !== undefined ||
      status !== undefined ||
      address !== undefined ||
      isTeamLeader !== undefined ||
      category !== undefined ||
      teamId !== undefined ||
      generation !== undefined ||
      restrictedArea !== undefined;

    if (!hasAny) {
      throw new AppError('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
    }

    const user = await userRepository.findById(id);
    if (!user) throw new AppError('해당 회원을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');

    const userData: Prisma.UserUpdateInput = {};
    if (name !== undefined) userData.name = name;
    if (phoneNumber !== undefined) userData.userphoneNumber = phoneNumber;
    if (status !== undefined) userData.status = status as UserStatus;

    const instructorData: Prisma.InstructorUpdateInput = {};
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
      // 관리자 직접 관리 필드
      if (category !== undefined) {
        instructorData.category = category as any;
      }
      if (teamId !== undefined) {
        if (teamId === null) {
          instructorData.team = { disconnect: true };
        } else {
          instructorData.team = { connect: { id: teamId } };
        }
      }
      if (generation !== undefined) {
        instructorData.generation = generation;
      }
      if (restrictedArea !== undefined) {
        instructorData.restrictedArea = restrictedArea;
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
