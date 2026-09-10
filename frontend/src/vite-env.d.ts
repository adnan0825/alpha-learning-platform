/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PROXY_API_TARGET?: string;
  readonly VITE_HERO_INTRO_VIDEO_URL?: string;
  readonly VITE_HERO_INTRO_VIDEO_POSTER?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
