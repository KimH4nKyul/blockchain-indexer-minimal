import { Injectable } from '@nestjs/common';
import { TransactionReceiptRepository } from '../../../domain/port/repository/transaction-receipt.repository';
import { TransactionReceipt } from '../../../domain/model/transaction-receipt.model';
import { PrismaService } from './prisma.service';
import { Log } from '../../../domain/model/log.model'; // Assuming Log model is needed for full hydration

@Injectable()
export class PrismaTransactionReceiptRepository extends TransactionReceiptRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(receipt: TransactionReceipt): Promise<void> {
    await this.prisma.transactionReceipt.upsert({
      where: { transactionHash: receipt.transactionHash },
      update: {},
      create: {
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed,
        status: receipt.status,
        logs: {
          createMany: {
            data: receipt.logs.map((log) => ({
              address: log.address,
              topics: JSON.stringify(log.topics),
              data: log.data,
              blockHash: log.blockHash,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
            })),
          },
        },
      },
    });
  }

  public async findByTransactionHash(
    transactionHash: string,
  ): Promise<TransactionReceipt | null> {
    const prismaReceipt = await this.prisma.transactionReceipt.findUnique({
      where: { transactionHash },
      include: { logs: { orderBy: { logIndex: 'asc' } } },
    });
    if (!prismaReceipt) return null;

    const logs: Log[] = prismaReceipt.logs.map(
      (pl) =>
        new Log(
          pl.address,
          JSON.parse(pl.topics) as string[],
          pl.data,
          pl.blockHash,
          pl.transactionHash,
          pl.logIndex,
          prismaReceipt.transactionHash, // transactionReceiptId
        ),
    );

    return new TransactionReceipt(
      prismaReceipt.transactionHash,
      prismaReceipt.blockHash,
      prismaReceipt.blockNumber,
      prismaReceipt.from,
      prismaReceipt.to,
      prismaReceipt.gasUsed,
      prismaReceipt.status as 'success' | 'reverted',
      logs,
    );
  }

  public async findByBlockHash(
    blockHash: string,
  ): Promise<TransactionReceipt[]> {
    const prismaReceipts = await this.prisma.transactionReceipt.findMany({
      where: { blockHash },
      include: { logs: { orderBy: { logIndex: 'asc' } } },
      orderBy: { blockNumber: 'asc' }, // Order by blockNumber for consistency
    });

    return prismaReceipts.map((prismaReceipt) => {
      const logs: Log[] = prismaReceipt.logs.map(
        (pl) =>
          new Log(
            pl.address,
            JSON.parse(pl.topics) as string[],
            pl.data,
            pl.blockHash,
            pl.transactionHash,
            pl.logIndex,
            prismaReceipt.transactionHash,
          ),
      );
      return new TransactionReceipt(
        prismaReceipt.transactionHash,
        prismaReceipt.blockHash,
        prismaReceipt.blockNumber,
        prismaReceipt.from,
        prismaReceipt.to,
        prismaReceipt.gasUsed,
        prismaReceipt.status as 'success' | 'reverted',
        logs,
      );
    });
  }
}
