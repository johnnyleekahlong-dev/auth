import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string; // Optional property if it might not always be set
  }
}
