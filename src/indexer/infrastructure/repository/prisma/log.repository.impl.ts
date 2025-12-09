import { Injectable } from '@nestjs/common';
import {
  LogFilter,
  LogRepository,
} from '../../../domain/port/repository/log.repository';
import { Log } from '../../../domain/model/log.model';
import { PrismaService } from './prisma.service';
import { Prisma } from '../../../../generated/client/client';

@Injectable()
export class PrismaLogRepository extends LogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async saveMany(logs: Log[]): Promise<void> {
    if (logs.length === 0) return;
    await this.prisma.log.createMany({
      data: logs.map((log) => ({
        address: log.address,
        topics: JSON.stringify(log.topics), // Serialize topics
        data: log.data,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        transactionReceiptId: log.transactionReceiptId,
      })),
    });
  }

  public async findByTransactionHash(transactionHash: string): Promise<Log[]> {
    const prismaLogs = await this.prisma.log.findMany({
      where: { transactionHash },
      orderBy: { logIndex: 'asc' },
    });
    return prismaLogs.map(
      (pl) =>
        new Log(
          pl.address,
          JSON.parse(pl.topics) as string[], // Deserialize topics // Deserialize topics
          pl.data,
          pl.blockHash,
          pl.transactionHash,
          pl.logIndex,
          pl.transactionReceiptId,
        ),
    );
  }

  public async findByBlockHash(blockHash: string): Promise<Log[]> {
    const prismaLogs = await this.prisma.log.findMany({
      where: { blockHash },
      orderBy: { logIndex: 'asc' },
    });
    return prismaLogs.map(
      (pl) =>
        new Log(
          pl.address,
          JSON.parse(pl.topics) as string[], // Deserialize topics
          pl.data,
          pl.blockHash,
          pl.transactionHash,
          pl.logIndex,
          pl.transactionReceiptId,
        ),
    );
  }

  public async findByAddress(address: string): Promise<Log[]> {
    const prismaLogs = await this.prisma.log.findMany({
      where: { address },
      orderBy: { logIndex: 'asc' },
    });
    return prismaLogs.map(
      (pl) =>
        new Log(
          pl.address,
          JSON.parse(pl.topics) as string[], // Deserialize topics
          pl.data,
          pl.blockHash,
          pl.transactionHash,
          pl.logIndex,
          pl.transactionReceiptId,
        ),
    );
  }

  public async find(
    filter: LogFilter,
    take: number,
    skip?: number,
  ): Promise<Log[]> {
    const where: Prisma.LogWhereInput = {};
    if (filter.address) where.address = filter.address;
    if (filter.transactionHash) where.transactionHash = filter.transactionHash;
    if (filter.topic0) {
      where.topics = {
        contains: filter.topic0, // Simple string contains for JSON array string
      };
    }
    // Note: Filtering by block number range requires joining with Block table,
    // or we can just filter by blockHash if we had it, or we rely on ID/createdAt for range roughly.
    // For simplicity in this minimal indexer, we might skip complex block range joins unless requested.
    // But let's see if we can do a simple relation filter if Prisma supports it easily.
    if (filter.fromBlock || filter.toBlock) {
      where.block = {
        number: {
          gte: filter.fromBlock,
          lte: filter.toBlock,
        },
      };
    }

    const prismaLogs = await this.prisma.log.findMany({
      where,
      take,
      skip,
      orderBy: { id: 'desc' },
      include: { block: true }, // Needed for block number filter if not implicitly handled
    });

    return prismaLogs.map(
      (pl) =>
        new Log(
          pl.address,
          JSON.parse(pl.topics) as string[],
          pl.data,
          pl.blockHash,
          pl.transactionHash,
          pl.logIndex,
          pl.transactionReceiptId,
        ),
    );
  }
}
