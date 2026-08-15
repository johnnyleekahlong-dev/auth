import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      name?: string;
      email: string;
      role: string;
    };
    csrfToken?: string;
  }
}
