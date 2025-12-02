import { trace, context } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { initializeFaro, getWebInstrumentations, FetchTransport } from '@grafana/faro-web-sdk';
import { FaroMetaAttributesSpanProcessor, FaroTraceExporter } from '@grafana/faro-web-tracing';

const APP_NAME = 'esp8266-web-ui';

const otelEndpointUrl = import.meta.env.VITE_OTEL_ENDPOINT_URL;
const otelUrl = new URL(otelEndpointUrl);

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiUrl = new URL(apiBaseUrl);

export const faro = initializeFaro({
	app: {
		name: APP_NAME,
		version: __APP_VERSION__,
		environment: import.meta.env.VITE_ENVIRONMENT
	},
	instrumentations: [...getWebInstrumentations({ captureConsole: true })],
	transports: [
		new FetchTransport({
			url: otelEndpointUrl,
			requestOptions: {
				headers: {
					'X-Data-Type': 'faro'
				}
			}
		})
	]
});

const resource = defaultResource().merge(
	resourceFromAttributes({
		[ATTR_SERVICE_NAME]: APP_NAME,
		[ATTR_SERVICE_VERSION]: __APP_VERSION__
	})
);

const faroExporter = new FaroTraceExporter({ ...faro });

const processor = new FaroMetaAttributesSpanProcessor(
	new BatchSpanProcessor(faroExporter, {
		scheduledDelayMillis: 2500
	}),
	faro.metas
);

const provider = new WebTracerProvider({
	resource: resource,
	spanProcessors: [processor]
});

faro.api.initOTEL(trace, context);
provider.register({ contextManager: new ZoneContextManager() });

registerInstrumentations({
	instrumentations: [
		new DocumentLoadInstrumentation(),
		new FetchInstrumentation({
			ignoreUrls: [new RegExp(otelUrl.pathname)],
			propagateTraceHeaderCorsUrls: [new RegExp(otelUrl.origin), new RegExp(apiUrl.origin)],
			clearTimingResources: true
		}),
		new UserInteractionInstrumentation()
	]
});
