const userRepository = require('../repositories/user.repository');

exports.findAll = async () => {
  return await userRepository.findAll();
};

exports.create = async (userData) => {
  // Add business logic here
  return await userRepository.create(userData);
};
