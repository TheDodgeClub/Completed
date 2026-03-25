declare namespace Express {
  interface Request {
    session: { userId: number } | null;
  }
}
