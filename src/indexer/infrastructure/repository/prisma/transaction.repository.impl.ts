import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../../domain/port/repository/repositories';
import { Transaction } from '../../../domain/model/transaction.model';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTransactionRepository extends TransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(transaction: Transaction): Promise<void> {
    await this.prisma.transaction.upsert({
      where: { hash: transaction.hash },
      update: {},
      create: {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        input: transaction.input,
        blockHash: transaction.blockHash,
      },
    });
  }

  public async findByHash(hash: string): Promise<Transaction | null> {
    const tx = await this.prisma.transaction.findUnique({
      where: { hash },
    });
    if (!tx) return null;
    return new Transaction(
      tx.hash,
      tx.from,
      tx.to,
      tx.value,
      tx.input,
      tx.blockHash,
    );
  }

  public async findByBlockHash(blockHash: string): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
      where: { blockHash },
    });
    return txs.map(
      (tx) =>
        new Transaction(
          tx.hash,
          tx.from,
          tx.to,
          tx.value,
          tx.input,
          tx.blockHash,
        ),
    );
  }

  public async findMany(take: number, skip?: number): Promise<Transaction[]> {
    const txs = await this.prisma.transaction.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
    });
    return txs.map(
      (tx) =>
        new Transaction(
          tx.hash,
          tx.from,
          tx.to,
          tx.value,
          tx.input,
          tx.blockHash,
        ),
    );
  }
}
