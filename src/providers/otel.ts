import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, SimpleSpanProcessor, ConsoleSpanExporter, ParentBasedSampler, TraceIdRatioBasedSampler} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {defaultResource, resourceFromAttributes} from '@opentelemetry/resources';


const resource = defaultResource().merge(
    resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'pokemon-app',
        [ATTR_SERVICE_VERSION]: '1.0.0',
    })
);

const consoleExporter = new ConsoleSpanExporter();

const jaegerExporter = new OTLPTraceExporter({
  url: 'http://localhost:14318/v1/traces', // Points to collector, not directly to Jaeger
});


export const provider = new WebTracerProvider({
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(1.0), // Sample 100% for testing
    remoteParentSampled: new TraceIdRatioBasedSampler(1.0),
    remoteParentNotSampled: new TraceIdRatioBasedSampler(0.0),
    localParentSampled: new TraceIdRatioBasedSampler(1.0),
    localParentNotSampled: new TraceIdRatioBasedSampler(0.0),
  }),
    resource,
    spanProcessors: [
      new SimpleSpanProcessor(consoleExporter),
      new BatchSpanProcessor(jaegerExporter)
    ],
});

window.addEventListener('load', () => {
  const tracer = provider.getTracer('pokemon-app');
  const span = tracer.startSpan('page.load');
  
  // Get navigation timing data
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navigation) {
    const pageLoadTime = navigation.loadEventEnd - navigation.startTime;
    const domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.startTime;
    const firstPaintTime = navigation.responseEnd - navigation.startTime;
    
    
    span.setAttribute('page.load.duration', pageLoadTime);
    span.setAttribute('page.dom_content_loaded.duration', domContentLoadedTime);
    span.setAttribute('page.first_paint.duration', firstPaintTime);
    span.setAttribute('page.url', window.location.href);
    
    span.addEvent('page.loaded', {
      'load_time_ms': pageLoadTime,
      'dom_ready_ms': domContentLoadedTime
    });
  }
  
  span.end();
});


window.onerror = function (message, source, lineno, colno, error) {
    const tracer = provider.getTracer('pokemon-app');
    const span = tracer.startSpan('uncaught-exception');
    span.setAttribute('error', true);
    span.setAttribute('error.message', String(message));
    span.addEvent('exception', {
      'exception.type': error?.name || 'Error',
      'exception.message': String(message),
      'exception.stacktrace': error?.stack || '',
      'source': String(source),
      'lineno': lineno,
      'colno': colno,
    });
    span.end();
  };
