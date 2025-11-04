import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			devOptions: { enabled: true },
			injectRegister: 'auto',
			includeAssets: ['favicon.svg', 'icon.svg'],
			manifest: {
				name: 'ESP8266 Web',
				short_name: 'ESP8266 Web',
				background_color: '#ffffff',
				theme_color: '#000000',
				icons: [
					{
						src: 'icon.svg',
						sizes: 'any',
						type: 'image/svg+xml'
					}
				]
			}
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['localStorage', 'preferredLanguage', 'url', 'baseLocale']
		})
	]
});
