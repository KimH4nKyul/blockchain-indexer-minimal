import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure';
import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/repository/transaction.repository';

@Injectable()
export class TransactionPrismaRepository implements TransactionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // TODO: 이 메서드로 스케줄러가 리시트가 없는 트랜잭션을 찾을 수 있게 한다.
  async findWithoutReceipt(): Promise<Transaction[]> {
    const entity = await this.prismaService.transaction.findMany({
      where: {
        receipt: null,
      },
    });

    return entity.map((tx) =>
      Transaction.from({
        ...tx,
        logs: [],
      }),
    );
  }

  public async saveBatch(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;

    // Prisma createMany는 연관 관계(Nested Write)를 지원하지 않습니다.
    // 따라서 receipt와 logs 객체는 제외하고, 순수 트랜잭션 스칼라 데이터만 추출하여 저장해야 합니다.
    const data = transactions.map((tx) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { receipt, logs, value, ...primitives } = tx.toPrimitives();
      return {
        ...primitives,
        value: value.toString(), // Ethereum uint256은 DB BigInt(int64) 범위를 초과하므로 String으로 저장
      };
    });

    await this.prismaService.transaction.createMany({
      data: data,
      skipDuplicates: true,
    });
  }
}
