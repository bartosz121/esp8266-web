import type { Reading } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export type GetReadingsQueryParams = {
	to?: number;
	from?: number;
	limit?: number;
	offset?: number;
};

export async function getReadings(params: GetReadingsQueryParams): Promise<Reading[]> {
	const searchParams = new URLSearchParams();

	if (params.to !== undefined) searchParams.append('to', params.to.toString());
	if (params.from !== undefined) searchParams.append('from', params.from.toString());
	if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
	if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());

	const url = `${baseUrl}/data${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
	console.log({ url });

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch data: ${response.statusText}`);
	}

	return response.json();
}
