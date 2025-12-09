import { Injectable, Logger } from '@nestjs/common';
import { LoggerPort } from '../../domain/port/logger/logger.port';

@Injectable()
export class NestLoggerAdapter extends LoggerPort {
  private readonly logger = new Logger('Indexer');

  public log(message: string): void {
    this.logger.log(message);
  }

  public error(message: string, trace?: string): void {
    this.logger.error(message, trace);
  }

  public warn(message: string): void {
    this.logger.warn(message);
  }

  public debug(message: string): void {
    this.logger.debug(message);
  }
}
