import { Kafka, Producer, SASLOptions, logLevel } from 'kafkajs';
import { ApiLog } from '../types';
import { CrmLog } from './types';

const TIMER_INTERVAL = 1000 * 10;

const LOG_BUFFER_SIZE = 100;

const SERVICE = 'lean-ticket';

export class CrmService {
  private timerId?: NodeJS.Timer;

  private logBuffer: CrmLog[] = [];

  private kafkaProducer: Producer;

  private kafkaTopic: string;

  constructor() {
    try {
      const { CRM_KAFKA_TOPIC } = process.env;
      if (!CRM_KAFKA_TOPIC) {
        throw new Error('CRM_KAFKA_TOPIC is not defined');
      }
      this.kafkaTopic = CRM_KAFKA_TOPIC;

      const kafka = createKafkaClient();
      this.kafkaProducer = kafka.producer();
      this.kafkaProducer.connect();
    } catch (error) {
      console.error(`[CRM Service]: ${(error as Error).message}`);
      process.exit(1);
    }
    this.startTimer();
  }

  startTimer() {
    if (this.timerId) {
      return;
    }
    this.timerId = setInterval(this.flush.bind(this), TIMER_INTERVAL);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      delete this.timerId;
    }
  }

  write(log: ApiLog) {
    if (log.statusCode >= 400) {
      return;
    }
    this.logBuffer.push({
      service: SERVICE,
      timestamp: log.timestamp,
      method: log.method,
      route: log.route,
      url: log.url,
      host: log.host,
      status_code: log.statusCode,
      process_time: log.processTime,
      app_id: log.appId,
      product_id: log.productId,
      user_id: log.userId,
      user_agent: log.userAgent,
      referer: log.referer,
    });
    if (this.logBuffer.length >= LOG_BUFFER_SIZE) {
      this.flush();
    }
  }

  async flush() {
    if (this.logBuffer.length === 0) {
      return;
    }

    const messages = this.logBuffer.map((log) => ({ value: JSON.stringify(log) }));
    this.logBuffer = [];

    await this.kafkaProducer.send({
      topic: this.kafkaTopic,
      messages,
    });
  }
}

function createKafkaClient() {
  const {
    CRM_KAFKA_BROKERS,
    CRM_KAFKA_SASL_PLAIN_USERNAME,
    CRM_KAFKA_SASL_PLAIN_PASSWORD,
  } = process.env;

  if (!CRM_KAFKA_BROKERS) {
    throw new Error('CRM_KAFKA_BROKERS is not defined');
  }

  let sasl: SASLOptions | undefined;

  if (CRM_KAFKA_SASL_PLAIN_USERNAME) {
    if (!CRM_KAFKA_SASL_PLAIN_PASSWORD) {
      throw new Error('CRM_KAFKA_SASL_PLAIN_PASSWORD is not defined');
    }
    sasl = {
      mechanism: 'plain',
      username: CRM_KAFKA_SASL_PLAIN_USERNAME,
      password: CRM_KAFKA_SASL_PLAIN_PASSWORD,
    };
  }

  return new Kafka({
    clientId: SERVICE,
    brokers: CRM_KAFKA_BROKERS.split(','),
    sasl,
    logLevel: logLevel.WARN,
    ssl: true,
  });
}
