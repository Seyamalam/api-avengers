import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export function initTelemetry(serviceName: string) {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
