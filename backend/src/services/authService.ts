import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const processSecret = process.env.JWT_SECRET || 'supersecret';

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

export const issueToken = (payload: object): string => {
    return jwt.sign(payload, processSecret, { expiresIn: '24h' });
};

export const verifyToken = (token: string): any => {
    return jwt.verify(token, processSecret);
};
