// import { Request } from 'express';

// interface SessionUser {
//   id: string;
//   email: string;
//   name: string;
// }

// export const createSession = (
//   req: Request,
//   user: SessionUser,
//   remember?: Boolean,
// ): Promise<void> => {
//   return new Promise((resolve, reject) => {
//     req.session.user = {
//       id: user.id.toString(),
//       email: user.email,
//       name: user.name,
//     };

//     if (remember) {
//       req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
//     }

//     req.session.save((err) => {
//       if (err) {
//         return reject(err);
//       }

//       resolve();
//     });
//   });
// };

import { Request, Response } from 'express';
import crypto from 'crypto';

interface SessionUser {
  _id: string;
  email: string;
  name: string;
}

export const createSession = (
  req: Request,
  res: Response,
  user: SessionUser,
  remember?: boolean,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Regenerate FIRST, before anything else touches the session. This
    // issues a brand-new session ID at the exact moment of privilege
    // escalation (anonymous -> authenticated), which is what actually
    // prevents session fixation — an attacker who got a victim to use a
    // session ID they already knew (e.g. via a shared kiosk, or a crafted
    // link) can't inherit the authenticated session, because login always
    // produces a fresh ID regardless of what came before it.
    req.session.regenerate((err) => {
      if (err) return reject(err);

      req.session.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      };

      // req.session.csrfToken = crypto.randomBytes(32).toString('hex');

      const csrfToken = crypto.randomBytes(32).toString('hex');
      req.session.csrfToken = csrfToken;

      // Deliberately NOT httpOnly — the frontend needs to read this value
      // to echo it back as a header. It's not a secret the way the session
      // cookie is; its security comes from same-origin JS being the only
      // thing that can read it, not from being hidden from JS entirely.

      // res.cookie('csrf-token', req.session.csrfToken, {
      //   httpOnly: false,
      //   secure: true,
      //   sameSite: 'none',
      //   path: '/',
      // });

      // Set maxAge AFTER regenerate (regenerate resets cookie options back
      // to the session() middleware's defaults) but BEFORE the one save
      // call below — same reasoning as before: one save, with every
      // mutation applied before it, no ordering seam for bugs to hide in.
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
