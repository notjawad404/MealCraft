const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../model/userModel');

const signToken = (userId) =>
    jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { name, email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, passwordHash });

        const token = signToken(user._id);
        return res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = signToken(user._id);
        return res.status(200).json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login };
