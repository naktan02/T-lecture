// domains/user/services/user.me.service.js
const userRepository = require('../repositories/user.repository');
// 나중에 강사 직업정보까지 함께 수정하고 싶으면 이 서비스도 사용할 수 있음
// const instructorService = require('../../instructor/instructor.service');

exports.getMyProfile = async (userId) => {
    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    // 여기서 필요하면 응답 형태를 한번 더 가공
    // 예: instructor 정보가 있어도 일부만 보내기 등
    return user;
};

exports.updateMyProfile = async (userId, payload) => {
  // 자기 자신이 수정 가능한 필드만 필터링
    const { name, phoneNumber } = payload;
    const dataToUpdate = {};

    if (name !== undefined) dataToUpdate.name = name;
    if (phoneNumber !== undefined) dataToUpdate.userphoneNumber = phoneNumber;

    if (Object.keys(dataToUpdate).length === 0) {
        // 변경할 게 없으면 그냥 현재 프로필 반환
        return await userRepository.findById(userId);
    }

    const updated = await userRepository.update(userId, dataToUpdate);
    return updated;
};
