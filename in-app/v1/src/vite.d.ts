/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_LEANCLOUD_APP_ID: string;
  VITE_LEANCLOUD_APP_KEY: string;
  VITE_LEANCLOUD_API_HOST: string;
  VITE_LC_TICKET_HOST?: string;
  VITE_ALLOW_MUTATE_EVALUATION: string;
  VITE_SENTRY_WEB_DSN?: string;
}
