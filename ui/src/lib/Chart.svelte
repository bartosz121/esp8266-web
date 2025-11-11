<script lang="ts">
	import * as echarts from 'echarts';
	import type { Reading } from './types';
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		readings: Reading[];
		theme: 'light' | 'dark';
	}

	let { readings, theme }: Props = $props();

	function prepareData(readings: Reading[]) {
		// Reverse data for chart (oldest to newest)
		const reversedReadings = [...readings].reverse();

		const tempCoData = reversedReadings.map((r) => [
			r.timestamp ? r.timestamp * 1000 : Date.now(),
			r.tempCo
		]);

		const tempRoomData = reversedReadings.map((r) => [
			r.timestamp ? r.timestamp * 1000 : Date.now(),
			r.tempRoom
		]);

		const humidityData = reversedReadings.map((r) => [
			r.timestamp ? r.timestamp * 1000 : Date.now(),
			r.humidity
		]);

		return { tempCoData, tempRoomData, humidityData };
	}

	function echartsAttachment(theme: 'light' | 'dark'): Attachment {
		return (element) => {
			const chart = echarts.init(element as HTMLElement, theme);

			const option = {
				tooltip: {
					trigger: 'axis',
					axisPointer: {
						type: 'cross'
					}
				},
				legend: {
					top: 0,
					data: ['CO Temp', 'Room Temp', 'Humidity']
				},
				grid: {
					left: '3%',
					right: '4%',
					containLabel: true
				},
				xAxis: {
					type: 'time',
					boundaryGap: false,
					axisLabel: {
						rotate: window.innerWidth <= 768 ? 45 : 0,
						interval: window.innerWidth <= 768 ? 'auto' : 0
					}
				},
				yAxis: [
					{
						type: 'value',
						name: (window.innerWidth <= 768 ? 'Temp.' : 'Temperature') + ' (°C)',
						position: 'left'
					},
					{
						type: 'value',
						name: 'Humidity (%)',
						position: 'right',
						offset: 0
					}
				],
				dataZoom: [
					{
						type: 'slider',
						// Zoom in on mobile
						start: window.innerWidth <= 768 ? 75 : 0,
						end: 100
					},
					{
						type: 'inside'
					}
				],
				series: [
					{
						name: 'CO Temp',
						type: 'line',
						yAxisIndex: 0,
						data: []
					},
					{
						name: 'Room Temp',
						type: 'line',
						yAxisIndex: 0,
						data: []
					},
					{
						name: 'Humidity',
						type: 'line',
						yAxisIndex: 1,
						data: []
					}
				]
			};

			chart.setOption(option);

			const resizeHandler = () => {
				chart.resize();
				// Update axis label rotation and grid on resize
				chart.setOption({
					grid: {
						bottom: window.innerWidth <= 768 ? '20%' : '15%'
					},
					xAxis: {
						axisLabel: {
							rotate: window.innerWidth <= 768 ? 45 : 0,
							interval: window.innerWidth <= 768 ? 'auto' : 0
						}
					}
				});
			};

			window.addEventListener('resize', resizeHandler);

			$effect(() => {
				if (readings.length > 0) {
					const { tempCoData, tempRoomData, humidityData } = prepareData(readings);
					chart.setOption({
						series: [{ data: tempCoData }, { data: tempRoomData }, { data: humidityData }]
					});
				}
			});

			return () => {
				window.removeEventListener('resize', resizeHandler);
				chart.dispose();
			};
		};
	}
</script>

<div {@attach echartsAttachment(theme)} class="h-full w-full"></div>
