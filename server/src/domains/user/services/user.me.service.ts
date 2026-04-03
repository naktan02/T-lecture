import AppError from '../../../common/errors/AppError';
import kakaoService from '../../../infra/kakao.service';
import distanceService from '../../distance/distance.service';
import dispatchRepository from '../../dispatch/dispatch.repository';
import inquiryRepository from '../../inquiry/inquiry.repository';
import noticeRepository from '../../notice/notice.repository';
import userRepository from '../repositories/user.repository';

interface UpdateProfileDto {
  name?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  category?: string;
  restrictedArea?: string;
  hasCar?: boolean;
  virtueIds?: number[];
  locationDetail?: string;
}

const VALID_INSTRUCTOR_CATEGORIES = ['Main', 'Co', 'Assistant', 'Practicum'] as const;
type InstructorCategory = (typeof VALID_INSTRUCTOR_CATEGORIES)[number];

type UserUpdateData = Parameters<typeof userRepository.update>[1];
type InstructorUpdateData = Exclude<Parameters<typeof userRepository.update>[2], undefined>;

class UserMeService {
  async getMyProfile(userId: number | string) {
    const user = await userRepository.findByIdWithDetails(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    const { password, ...profile } = user;
    void password;

    const { instructor, ...rest } = profile;
    if (instructor) {
      return { ...rest, instructor };
    }

    return rest;
  }

  async getMyHeaderCounts(userId: number | string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    const numericUserId = Number(userId);
    const [dispatchUnreadCount, noticeUnreadCount, inquiryUnreadAnswerCount] = await Promise.all([
      dispatchRepository.countUnread(numericUserId),
      noticeRepository.countUnread(numericUserId),
      inquiryRepository.countUnreadAnswers(numericUserId),
    ]);

    return {
      dispatchUnreadCount,
      noticeUnreadCount,
      inquiryUnreadAnswerCount,
    };
  }

  async updateMyProfile(userId: number | string, dto: UpdateProfileDto) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      throw new AppError('요청 본문 형식이 올바르지 않습니다.', 400, 'INVALID_BODY');
    }

    const {
      name,
      phoneNumber,
      email,
      password,
      category,
      restrictedArea,
      hasCar,
      virtueIds,
      locationDetail,
    } = dto;

    if (name !== undefined && name !== null && typeof name !== 'string') {
      throw new AppError('name은 문자열이어야 합니다.', 400, 'INVALID_NAME');
    }

    if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== 'string') {
      throw new AppError('phoneNumber는 문자열이어야 합니다.', 400, 'INVALID_PHONE_NUMBER');
    }

    if (email !== undefined && email !== null && typeof email !== 'string') {
      throw new AppError('email은 문자열이어야 합니다.', 400, 'INVALID_EMAIL');
    }

    if (password !== undefined && password !== null && typeof password !== 'string') {
      throw new AppError('password는 문자열이어야 합니다.', 400, 'INVALID_PASSWORD');
    }

    if (category !== undefined && category !== null && typeof category !== 'string') {
      throw new AppError('category는 문자열이어야 합니다.', 400, 'INVALID_CATEGORY');
    }

    const hasAnyField =
      name !== undefined ||
      phoneNumber !== undefined ||
      email !== undefined ||
      password !== undefined ||
      category !== undefined ||
      restrictedArea !== undefined ||
      hasCar !== undefined ||
      virtueIds !== undefined ||
      locationDetail !== undefined;

    if (!hasAnyField) {
      throw new AppError('수정할 값이 없습니다.', 400, 'NO_UPDATE_FIELDS');
    }

    const user = await userRepository.findByIdWithDetails(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    const userData: UserUpdateData = {};
    if (name !== undefined) {
      userData.name = name;
    }
    if (phoneNumber !== undefined) {
      userData.userphoneNumber = phoneNumber;
    }

    if (email !== undefined && email !== user.userEmail) {
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        throw new AppError('이미 사용 중인 이메일입니다.', 409, 'EMAIL_EXISTS');
      }

      userData.userEmail = email;
    }

    if (password !== undefined && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      userData.password = await bcrypt.hash(password, 10);
    }

    const instructorData: InstructorUpdateData = {};
    const isInstructor = !!user.instructor;

    if (isInstructor) {
      if (category !== undefined) {
        if (
          category !== '' &&
          !VALID_INSTRUCTOR_CATEGORIES.includes(category as InstructorCategory)
        ) {
          throw new AppError('유효하지 않은 직책 값입니다.', 400, 'INVALID_CATEGORY');
        }

        instructorData.category = category === '' ? null : (category as InstructorCategory);
      }

      if (restrictedArea !== undefined) {
        instructorData.restrictedArea = restrictedArea === '' ? null : restrictedArea;
      }

      if (hasCar !== undefined) {
        instructorData.hasCar = hasCar;
      }

      if (locationDetail !== undefined) {
        instructorData.locationDetail = locationDetail === '' ? null : locationDetail;
      }

      if (virtueIds !== undefined && Array.isArray(virtueIds)) {
        instructorData.virtues = {
          deleteMany: {},
          create: virtueIds.map((id) => ({
            virtue: { connect: { id } },
          })),
        };
      }

      const finalLocation = user.instructor?.location;
      const finalCategory =
        category !== undefined
          ? category === ''
            ? null
            : (category as InstructorCategory)
          : user.instructor?.category;
      instructorData.profileCompleted = !!(finalLocation && finalCategory);
    }

    const updatedUser = await userRepository.update(userId, userData, instructorData);
    const { password: persistedPassword, ...result } = updatedUser;
    void persistedPassword;

    const { instructor, ...restResult } = result;
    if (instructor) {
      return { ...restResult, instructor };
    }

    return restResult;
  }

  async withdraw(userId: number | string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    await userRepository.delete(userId);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }

  // Address updates also refresh coordinates and cached distances.
  async updateMyAddress(userId: number | string, address: string, locationDetail?: string) {
    if (address === undefined || address === null || typeof address !== 'string') {
      throw new AppError('address는 문자열이어야 합니다.', 400, 'INVALID_ADDRESS');
    }

    const user = await userRepository.findByIdWithDetails(userId);
    if (!user) {
      throw new AppError('사용자 정보를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }

    if (!user.instructor) {
      throw new AppError('강사만 주소를 수정할 수 있습니다.', 403, 'NOT_INSTRUCTOR');
    }

    const instructorData: InstructorUpdateData = {
      location: address === '' ? null : address,
      locationDetail: locationDetail === '' ? null : locationDetail,
    };

    if (address && address.trim() !== '') {
      const coords = await kakaoService.addressToCoordsOrNull(address);
      if (coords) {
        instructorData.lat = coords.lat;
        instructorData.lng = coords.lng;
      } else {
        instructorData.lat = null;
        instructorData.lng = null;
      }
    } else {
      instructorData.lat = null;
      instructorData.lng = null;
    }

    const finalLocation = address;
    const finalCategory = user.instructor.category;
    instructorData.profileCompleted = !!(finalLocation && finalCategory);

    const updatedUser = await userRepository.update(userId, {}, instructorData);
    await distanceService.invalidateDistancesForInstructor(Number(userId));

    const { password, ...result } = updatedUser;
    void password;

    const { instructor, ...restResult } = result;
    if (instructor) {
      return { ...restResult, instructor };
    }

    return restResult;
  }
}

export default new UserMeService();
