import { Controller, Get, Query } from '@nestjs/common';
import { LogApplication } from '../../application/log.application';
import { Log } from '../../domain/model/log.model';
import { LogFilterDto } from './dtos';

@Controller('logs')
export class LogController {
  constructor(private readonly logApplication: LogApplication) {}

  @Get()
  public async getLogs(@Query() query: LogFilterDto): Promise<Log[]> {
    const take = query.take ? Number(query.take) : 10;
    const skip = query.skip ? Number(query.skip) : 0;

    return await this.logApplication.getLogs(
      {
        address: query.address,
        topic0: query.topic0,
        fromBlock: query.fromBlock ? BigInt(query.fromBlock) : undefined,
        toBlock: query.toBlock ? BigInt(query.toBlock) : undefined,
        transactionHash: query.transactionHash,
      },
      take,
      skip,
    );
  }
}
