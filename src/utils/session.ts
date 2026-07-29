import { Request } from 'express';

interface SessionUser {
  _id: string;
  email: string;
  name: string;
}

export const createSession = (
  req: Request,
  user: SessionUser,
  remember?: Boolean,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    }

    req.session.save((err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
};
