/* document-load.ts|js file - the code is the same for both the languages */
import { ZoneContextManager } from '@opentelemetry/context-zone';
// import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { provider } from './providers/otel'; // Adjust the import path as necessary
// import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
// import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
// import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

provider.register({
  contextManager: new ZoneContextManager(),
});

// registerInstrumentations({
//   instrumentations: [
//     new DocumentLoadInstrumentation(),
//     new FetchInstrumentation(),
//     new XMLHttpRequestInstrumentation(), 
//   ],
// });

console.log('OpenTelemetry initialized');
  