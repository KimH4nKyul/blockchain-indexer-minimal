import { Log } from '../../model/log.model';

export interface LogFilter {
  address?: string;
  topic0?: string;
  fromBlock?: bigint;
  toBlock?: bigint;
  transactionHash?: string;
}

export abstract class LogRepository {
  public abstract saveMany(logs: Log[]): Promise<void>;
  public abstract findByTransactionHash(
    transactionHash: string,
  ): Promise<Log[]>;
  public abstract findByBlockHash(blockHash: string): Promise<Log[]>;
  public abstract findByAddress(address: string): Promise<Log[]>;
  public abstract find(
    filter: LogFilter,
    take: number,
    skip?: number,
  ): Promise<Log[]>;
}
