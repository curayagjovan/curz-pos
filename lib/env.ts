export const isDevDeployment =
  process.env.VERCEL_ENV !== undefined
    ? process.env.VERCEL_ENV !== "production"
    : process.env.NODE_ENV !== "production";
