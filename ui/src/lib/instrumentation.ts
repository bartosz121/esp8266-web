import { ZoneContextManager } from '@opentelemetry/context-zone';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

const otelEndpointUrl = import.meta.env.VITE_OTEL_ENDPOINT_URL;
const otelUrl = new URL(otelEndpointUrl);

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiUrl = new URL(apiBaseUrl);

const resource = defaultResource().merge(
	resourceFromAttributes({
		[ATTR_SERVICE_NAME]: 'esp8266-web-ui',
		[ATTR_SERVICE_VERSION]: __APP_VERSION__
	})
);

const collectorOptions = {
	url: otelEndpointUrl
};

const exporterProto = new OTLPTraceExporter(collectorOptions);
const processor = new BatchSpanProcessor(exporterProto, {
	scheduledDelayMillis: 2500
});

const provider = new WebTracerProvider({
	resource: resource,
	spanProcessors: [processor]
});

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
