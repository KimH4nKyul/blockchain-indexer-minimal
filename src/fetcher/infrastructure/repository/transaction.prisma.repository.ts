import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure';
import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/repository/transaction.repository';

@Injectable()
export class TransactionPrismaRepository implements TransactionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async saveBatch(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;

    // Prisma createMany는 연관 관계(Nested Write)를 지원하지 않습니다.
    // 따라서 receipt와 logs 객체는 제외하고, 순수 트랜잭션 스칼라 데이터만 추출하여 저장해야 합니다.
    const data = transactions.map((tx) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { receipt, logs, ...primitives } = tx.toPrimitives();
      return primitives;
    });

    await this.prismaService.transaction.createMany({
      data: data,
      skipDuplicates: true,
    });
  }
}