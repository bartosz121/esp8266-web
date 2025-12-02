interface ImportMetaEnv {
	readonly VITE_ENVIRONMENT: 'PRODUCTION' | 'DEVELOPMENT';
	readonly VITE_API_BASE_URL: string;
	readonly VITE_OTEL_ENDPOINT_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
