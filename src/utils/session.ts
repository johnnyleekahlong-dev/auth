import { Request } from 'express';

interface SessionUser {
  _id: string;
  email: string;
  name: string;
}

export const createSession = (
  req: Request,
  user: SessionUser,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    req.session.save((err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
};
