import { faro } from '$lib/instrumentation';
import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event }) => {
	faro.api.pushError(error as Error);

	console.error(error, event);
};
