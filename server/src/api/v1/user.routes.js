
const express = require('express');
const router = express.Router();
const userController = require('../../modules/user/controllers/user.controller');

// (POST) /users
router.post('/', userController.createUser);

// (GET) /users
router.get('/', userController.getUsers);

// (GET) /users/:id
router.get('/:id', userController.getUserById);

// (PUT) /users/:id
router.put('/:id', userController.updateUser);

// (DELETE) /users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;