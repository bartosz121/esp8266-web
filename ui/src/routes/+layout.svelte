<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import favicon from '$lib/assets/favicon.svg';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { pwaInfo } from 'virtual:pwa-info';
	import { LocalStorage } from '$lib/storage.svelte';

	let { children } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	const themeStorage = new LocalStorage<'light' | 'dark'>('theme');

	// Does the same as <script> inside <svelte:head>; Acts as a fallback for that code
	// js code in <script> prevents `flash` of light mode on page load if user prefers dark
	onMount(() => {
		const prefersDarkColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

		let storageTheme = themeStorage.current;
		if (storageTheme === null || !['light', 'dark'].includes(storageTheme)) {
			storageTheme = prefersDarkColorScheme ? 'dark' : 'light';
		}
		document.documentElement.setAttribute('data-theme', storageTheme);
		themeStorage.current = storageTheme;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{@html webManifestLink}
	<script>
		if (typeof localStorage !== 'undefined') {
			const theme = localStorage.getItem('theme');
			if (theme && ['light', 'dark'].includes(theme)) {
				document.documentElement.setAttribute('data-theme', theme);
			} else {
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
			}
		}
	</script>
</svelte:head>

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>

{@render children()}
