export const REQUIRE_R2: boolean = process.env.NODE_ENV === 'production';

export const ALLOW_LOCAL_UPLOADS: boolean =
  process.env.ALLOW_LOCAL_UPLOADS === 'true' && process.env.NODE_ENV !== 'production';

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_BUCKET &&
      process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}


