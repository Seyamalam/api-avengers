import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

if (process.env.ELASTICSEARCH_URL) {
  console.log('Initializing Elasticsearch transport with URL:', process.env.ELASTICSEARCH_URL);
  const esTransport = new ElasticsearchTransport({
    level: 'info',
    clientOpts: { node: process.env.ELASTICSEARCH_URL },
    indexPrefix: 'careforall-logs',
    source: 'careforall-app',
  });
  
  esTransport.on('error', (error) => {
    console.error('Elasticsearch transport error:', error);
  });

  esTransport.on('warning', (warning) => {
    console.warn('Elasticsearch transport warning:', warning);
  });

  esTransport.on('data', (data) => {
    console.log('Elasticsearch transport data sent:', data);
  });

  transports.push(esTransport);
}

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: process.env.SERVICE_NAME || 'unknown-service' },
  transports,
});

export const logger = {
  info: (msg: string, meta?: any) => winstonLogger.info(msg, meta),
  error: (msg: string, meta?: any) => winstonLogger.error(msg, meta),
  warn: (msg: string, meta?: any) => winstonLogger.warn(msg, meta),
};
