const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
} = require('../controller/authController');

const router = express.Router();

const registerRules = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileRules = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
];

const changePasswordRules = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileRules, updateProfile);
router.put('/change-password', authenticate, changePasswordRules, changePassword);

module.exports = router;

