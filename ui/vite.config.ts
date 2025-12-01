import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import gitVersionPlugin from './vite-plugin-git-version';

export default defineConfig({
	plugins: [
		gitVersionPlugin(),
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			devOptions: { enabled: true },
			injectRegister: 'auto',
			includeAssets: ['favicon.svg', 'icon.svg'],
			manifest: {
				name: 'Piec',
				short_name: 'Piec',
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
