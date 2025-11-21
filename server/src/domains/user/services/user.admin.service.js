// domains/user/services/user.admin.service.js
const userRepository = require('../repositories/user.repository');

exports.getUsers = async (query) => {
    // 간단 필터링 (role, status 정도) – 필요시 확장
    const { role, status } = query || {};
    const filters = {};

    if (role) filters.role = role;
    if (status) filters.status = status;

    return await userRepository.findMany(filters);
};

exports.getUserById = async (id) => {
    const user = await userRepository.findById(id);
    if (!user) {
        throw new Error('해당 사용자를 찾을 수 없습니다.');
    }
    return user;
};

exports.updateUser = async (id, payload) => {
    // 관리자는 role, status 등을 수정할 수 있음
    const { name, phoneNumber, role, status } = payload;
    const dataToUpdate = {};

    if (name !== undefined) dataToUpdate.name = name;
    if (phoneNumber !== undefined) dataToUpdate.userphoneNumber = phoneNumber;
    if (role !== undefined) dataToUpdate.role = role;
    if (status !== undefined) dataToUpdate.status = status;

    const updated = await userRepository.update(id, dataToUpdate);
    return updated;
};

exports.deleteUser = async (id) => {
    // 삭제 전 존재 여부 확인
    const user = await userRepository.findById(id);
    if (!user) {
        throw new Error('해당 사용자를 찾을 수 없습니다.');
    }
    await userRepository.delete(id);
};
