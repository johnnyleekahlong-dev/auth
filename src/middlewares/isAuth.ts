import { Request, Response, NextFunction } from 'express';

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.isAuth) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }

  next();
};
