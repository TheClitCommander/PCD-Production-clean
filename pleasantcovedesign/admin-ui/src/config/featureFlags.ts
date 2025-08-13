// Simple, env-driven flags (default ON unless explicitly "false")
export const FEATURES = {
  EXPORT_LEADS: (import.meta.env.VITE_FEATURE_EXPORT_LEADS ?? 'true') !== 'false',
  BULK_FOLLOWUP: (import.meta.env.VITE_FEATURE_BULK_FOLLOWUP ?? 'false') === 'true',
  REPORTS: (import.meta.env.VITE_FEATURE_REPORTS ?? 'false') === 'true',
  VIDEO_CALL: (import.meta.env.VITE_FEATURE_VIDEO_CALL ?? 'false') === 'true',
  CLIENT_ADD: (import.meta.env.VITE_FEATURE_CLIENT_ADD ?? 'true') !== 'false',
};
