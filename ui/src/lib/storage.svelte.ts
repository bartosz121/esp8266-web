import { browser } from '$app/environment';
import { on } from 'svelte/events';
import { createSubscriber } from 'svelte/reactivity';

export class LocalStorage<T> {
	#key: string;
	#subscribe: ReturnType<typeof createSubscriber>;
	#update: Parameters<Parameters<typeof createSubscriber>[0]>[0] | undefined;

	constructor(key: string) {
		this.#key = key;
		this.#subscribe = createSubscriber((update) => {
			this.#update = update;
			return on(window, 'storage', (event) => {
				if (event.key === this.#key) {
					update();
				}
			});
		});
	}

	get current(): T | null {
		if (!browser) {
			return null;
		}

		this.#subscribe();
		const strValue = window.localStorage.getItem(this.#key);
		let value = null;
		if (strValue) {
			try {
				value = JSON.parse(strValue);
			} catch {}
		}

		return value as T;
	}

	set current(newValue: T | null) {
		if (!browser) {
			return;
		}
		window.localStorage.setItem(this.#key, JSON.stringify(newValue));
		this.#update?.();
	}
}
