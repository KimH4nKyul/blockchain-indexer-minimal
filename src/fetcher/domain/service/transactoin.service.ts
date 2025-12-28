import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../repository/transaction.repository';
import { Transaction } from '../transaction';
import { BlockchainClient } from '../component/blockchain.client';

@Injectable()
export class TransactionService {
  constructor(
    private readonly blockchainClient: BlockchainClient,
    private readonly txRepository: TransactionRepository,
  ) {}

  public async receiptSync(transactions: Transaction[]): Promise<number> {
    // TODO: Transaction과 Receipt는 동일한 도메인으로 변경
    // 1. 트랜잭션별 리시트를 RPC 노드에서 가져옴
    const receipts =
      await this.blockchainClient.fetchReceiptsInParallel(transactions);
    // 2. 해당 Receipt를 테이블에 저장 (트랜잭션과 1:1 관계)
    return await this.txRepository.saveReceipts(receipts);
  }

  public async unreceiptedTransactions(
    limit: number = 50,
  ): Promise<Transaction[]> {
    return await this.txRepository.findWithoutReceipt(limit);
  }
}
