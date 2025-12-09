import { Injectable } from '@nestjs/common';
import { TransactionService } from '../domain/service/transaction.service';
import { Transaction } from '../domain/model/transaction.model';
import { TransactionReceipt } from '../domain/model/transaction-receipt.model';

@Injectable()
export class TransactionApplication {
  constructor(private readonly transactionService: TransactionService) {}

  public async getTransactions(
    take: number,
    skip: number,
  ): Promise<Transaction[]> {
    return await this.transactionService.getTransactions(take, skip);
  }

  public async getTransaction(hash: string): Promise<Transaction | null> {
    return await this.transactionService.getTransactionByHash(hash);
  }

  public async getTransactionReceipt(
    hash: string,
  ): Promise<TransactionReceipt | null> {
    return await this.transactionService.getTransactionReceipt(hash);
  }
}
