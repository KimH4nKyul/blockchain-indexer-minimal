import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure';
import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/repository/transaction.repository';
import { Receipt } from '../../domain/receipt';

@Injectable()
export class TransactionPrismaRepository implements TransactionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async saveReceipts(receipts: Receipt[]): Promise<number> {
    if (receipts.length === 0) return 0;

    // 1. 영수증 본체 데이터 준비 (logs 필드는 제외해야 함)
    const receiptData = receipts.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { logs, ...primitives } = r.toPrimitives();
      return primitives;
    });

    // 2. 로그 데이터 추출 및 평탄화 (Flatten)
    // id는 DB에서 자동 생성되므로 제외하고, 나머지 필드만 추출하여 타입 불일치 해결
    const logData = receipts.flatMap((r) =>
      r.logs.map((l) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, topics, ...rest } = l.toPrimitives();
        return {
          ...rest,
          topics: JSON.stringify(topics), // 배열을 JSON 문자열로 변환하여 저장
        };
      }),
    );

    // 3. DB 트랜잭션으로 묶어서 저장 (원자성 보장)
    return await this.prismaService.$transaction(async (tx) => {
      // 영수증 저장
      const result = await tx.transactionReceipt.createMany({
        data: receiptData,
        skipDuplicates: true,
      });

      // 로그 저장 (로그가 있는 경우에만)
      if (logData.length > 0) {
        await tx.log.createMany({
          data: logData,
          skipDuplicates: true,
        });
      }

      return result.count;
    });
  }

  // 스케줄러가 리시트가 없는 트랜잭션을 일정량(limit)만 찾을 수 있게 한다. (유량 제어)
  async findWithoutReceipt(limit: number): Promise<Transaction[]> {
    const entity = await this.prismaService.transaction.findMany({
      where: {
        receipt: null,
      },
      take: limit,
      orderBy: {
        createdAt: 'asc', // 오래된 것부터 순차적으로 처리
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
