import { Injectable } from '@nestjs/common';
import { LogService } from '../domain/service/log.service';
import { LogFilter } from '../domain/port/repository/log.repository';
import { Log } from '../domain/model/log.model';

@Injectable()
export class LogApplication {
  constructor(private readonly logService: LogService) {}

  public async getLogs(
    filter: LogFilter,
    take: number,
    skip: number,
  ): Promise<Log[]> {
    return await this.logService.getLogs(filter, take, skip);
  }
}
