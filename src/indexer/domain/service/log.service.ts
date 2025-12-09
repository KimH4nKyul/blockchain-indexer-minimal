import { Injectable } from '@nestjs/common';
import { LogRepository, LogFilter } from '../port/repository/log.repository';
import { Log } from '../model/log.model';

@Injectable()
export class LogService {
  constructor(private readonly logRepository: LogRepository) {}

  public async getLogs(
    filter: LogFilter,
    take: number,
    skip: number,
  ): Promise<Log[]> {
    return await this.logRepository.find(filter, take, skip);
  }
}
