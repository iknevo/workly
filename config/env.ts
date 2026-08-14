function getEnv(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value || "";
}

export const env = {
  NEXT_PUBLIC_APP_URL: getEnv("NEXT_PUBLIC_APP_URL", false),
  DATABASE_URL: getEnv("DATABASE_URL"),
  GROQ_API_KEY: getEnv("GROQ_API_KEY", false),
  UPSTASH_REDIS_REST_URL: getEnv("UPSTASH_REDIS_REST_URL", false),
  UPSTASH_REDIS_REST_TOKEN: getEnv("UPSTASH_REDIS_REST_TOKEN", false),
  ENCRYPTION_KEY: getEnv("ENCRYPTION_KEY", false),
};
