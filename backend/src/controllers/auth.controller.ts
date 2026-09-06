import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword, issueToken } from '../services/authService';
import { ApiError } from '../utils/ApiError';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role } = req.body;
        const existing = await User.findOne({ email });
        if (existing) throw new ApiError(400, 'User already exists');

        const pwdHash = await hashPassword(password);
        const user = await User.create({ name, email, passwordHash: pwdHash, role });
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).populate('tier');
        if (!user) throw new ApiError(401, 'Invalid credentials');

        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) throw new ApiError(401, 'Invalid credentials');

        const token = issueToken({ userId: user._id, role: user.role });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
                tier: user.tier
            }
        });
    } catch (error) { next(error); }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user._id).populate('tier');
        if (!user) throw new ApiError(404, 'User not found');
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                tier: user.tier
            }
        });
    } catch (error) { next(error); }
};
