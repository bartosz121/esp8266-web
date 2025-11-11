<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		currentTheme: 'light' | 'dark';
		setTheme: (theme: 'light' | 'dark') => void;
	}

	let { currentTheme, setTheme }: Props = $props();

	let icon = $derived(currentTheme === 'dark' ? '🌙' : '☀️');

	function toggleTheme(_: Event) {
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
	}
</script>

<button
	onclick={toggleTheme}
	aria-label={m.toggle_color_scheme()}
	class="mt-4 cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-200 md:mt-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
>
	{icon}
</button>
