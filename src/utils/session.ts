import { Request, Response } from 'express';
import crypto from 'crypto';

interface SessionUser {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export const createSession = (
  req: Request,
  res: Response,
  user: SessionUser,
  remember?: boolean,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);

      req.session.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      };

      const csrfToken = crypto.randomBytes(32).toString('hex');
      req.session.csrfToken = csrfToken;

      if (remember) {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
      }

      req.session.save((err) => {
        if (err) return reject(err);
        resolve(csrfToken);
      });
    });
  });
};
