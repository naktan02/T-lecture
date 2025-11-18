// modules/instructor/repositories/instructor.repository.js
const prisma = require('../../../libs/prisma');

exports.findAll = async () => {
    return prisma.instructor.findMany();
};

exports.findById = async (userId) => {
    return prisma.instructor.findUnique({
        where: { userId: Number(userId) },
        include: {
        user: true,
        virtues: true,
        availabilities: true
        }
    });
};

exports.updateCoords = async (userId, lat, lng) => {
    return prisma.instructor.update({
        where: { userId: Number(userId) },
        data: { lat, lng }
    });
};
