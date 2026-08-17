import { Request, Response, NextFunction } from 'express';

// Always chain this AFTER isAuth — it only checks the role on an
// already-established session, it doesn't check that a session exists.
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }

  if (req.session.user.role !== 'admin') {
    return res
      .status(403)
      .json({ success: false, message: 'Admin access required' });
  }

  next();
};
