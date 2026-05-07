export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  appUrl: process.env.APP_URL ?? "https://maprod.up.railway.app",
};
