<script lang="ts">
	import { useQueryClient, createQuery } from '@tanstack/svelte-query';

	import type { GetReadingsQueryParams } from '$lib/api';
	import { getReadings } from '$lib/api';
	import { LocalStorage } from '$lib/storage.svelte';
	import { m } from '$lib/paraglide/messages.js';

	import Chart from '$lib/Chart.svelte';
	import Spinner from '$lib/Spinner.svelte';
	import ToggleThemeBtn from '$lib/ToggleThemeBtn.svelte';

	let offsetQuery = $state(0);
	let limitQuery = $state(90); // ~1 request per minute

	let readingsQueryParams: GetReadingsQueryParams = $derived({
		offset: offsetQuery,
		limit: limitQuery
	});

	const themeStorage = new LocalStorage<'light' | 'dark'>('theme');

	const readingsQuery = createQuery(() => ({
		queryKey: ['readings', readingsQueryParams],
		queryFn: () => getReadings(readingsQueryParams),
		refetchInterval: 1000 * 70,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		refetchOnReconnect: 'always'
	}));

	function unixToPrettyDate(timestamp: number): string {
		const date = new Date(timestamp * 1000);
		const formatted =
			String(date.getHours()).padStart(2, '0') +
			':' +
			String(date.getMinutes()).padStart(2, '0') +
			':' +
			String(date.getSeconds()).padStart(2, '0') +
			' ' +
			date.getFullYear() +
			'/' +
			String(date.getMonth() + 1).padStart(2, '0') +
			'/' +
			String(date.getDate()).padStart(2, '0');

		return formatted;
	}

	let latestDataTimestampPretty = $derived.by(() => {
		if (!readingsQuery.data) {
			return '--';
		}

		return unixToPrettyDate(readingsQuery.data[0].timestamp);
	});

	let pageTitle = $derived.by(() => {
		if (!readingsQuery.data) {
			return m.temperature_monitor();
		}

		return `CO: ${readingsQuery.data?.[0]?.tempCo}°C | Room: ${readingsQuery.data?.[0]?.tempRoom}°C | ${latestDataTimestampPretty}`;
	});

	function setTheme(theme: 'light' | 'dark') {
		document.documentElement.setAttribute('data-theme', theme);
		themeStorage.current = theme;
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="min-h-screen bg-white text-gray-900 transition-colors dark:bg-black dark:text-gray-100">
	<div class="container mx-auto max-w-7xl px-4 py-8">
		<header
			class="mb-8 flex flex-col items-start justify-between border-b border-gray-200 pb-4 md:flex-row md:items-center dark:border-gray-800"
		>
			<div class="w-full">
				<div class="flex flex-col gap-6 text-sm text-gray-600 md:flex-row dark:text-gray-400">
					<div class="flex flex-col">
						<span class="text-xs tracking-wider uppercase">{m.co_temp()}</span>
						<span
							class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100"
							id="currentTempCo">{readingsQuery.data?.[0]?.tempCo ?? '--'}°C</span
						>
					</div>
					<div class="flex flex-col">
						<span class="text-xs tracking-wider uppercase">{m.room_temp()}</span>
						<span
							class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100"
							id="currentTempRoom">{readingsQuery.data?.[0]?.tempRoom ?? '--'}°C</span
						>
					</div>
					<div class="flex flex-col">
						<span class="text-xs tracking-wider uppercase">{m.humidity()}</span>
						<span
							class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100"
							id="currentHumidity">{readingsQuery.data?.[0]?.humidity ?? '--'}%</span
						>
					</div>
					<div class="flex flex-col">
						<span class="text-xs tracking-wider uppercase">{m.last_update()}</span>
						<span
							class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100"
							id="lastUpdate">{latestDataTimestampPretty}</span
						>
					</div>
					<div class="order-first flex items-center md:order-0 md:ml-auto">
						<ToggleThemeBtn currentTheme={themeStorage.current ?? 'light'} {setTheme} />
					</div>
				</div>
			</div>
		</header>

		<div
			class="chart-section flex h-[500px] flex-col rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950"
		>
			<div
				class="zoom-info mb-4 flex flex-col items-start justify-between text-sm text-gray-600 md:flex-row md:items-center dark:text-gray-400"
			></div>
			{#if readingsQuery.status === 'pending'}
				<div class="flex h-full items-center justify-center">
					<Spinner />
				</div>
			{:else if readingsQuery.status === 'error'}
				<div class="flex h-full items-center justify-center">
					<span class="text-2xl">{m.failed_to_load_data()}</span>
				</div>
			{:else}
				<Chart readings={readingsQuery.data} theme={themeStorage.current ?? 'light'} />
			{/if}
		</div>
	</div>
</div>
