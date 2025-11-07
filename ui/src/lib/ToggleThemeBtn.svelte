<script lang="ts">
	import { onMount } from 'svelte';
	import { LocalStorage } from '$lib/storage.svelte';

	const themeStorage = new LocalStorage<'light' | 'dark'>('theme');

	let icon = $derived(themeStorage.current === 'dark' ? '🌙' : '☀️');

	function toggleTheme(_: Event) {
		const currentTheme = document.documentElement.getAttribute('data-theme');
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', newTheme);
		themeStorage.current = newTheme;
	}
</script>

<button
	onclick={toggleTheme}
	aria-label="Toggle color scheme"
	class="mt-4 cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-200 md:mt-0 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
>
	{icon}
</button>
