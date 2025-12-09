import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../port/repository/repositories';
import { Transaction } from '../model/transaction.model';
import { TransactionReceiptRepository } from '../port/repository/transaction-receipt.repository';
import { TransactionReceipt } from '../model/transaction-receipt.model';

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly transactionReceiptRepository: TransactionReceiptRepository,
  ) {}

  public async getTransactions(
    take: number,
    skip: number,
  ): Promise<Transaction[]> {
    return await this.transactionRepository.findMany(take, skip);
  }

  public async getTransactionByHash(hash: string): Promise<Transaction | null> {
    return await this.transactionRepository.findByHash(hash);
  }

  public async getTransactionReceipt(
    hash: string,
  ): Promise<TransactionReceipt | null> {
    return await this.transactionReceiptRepository.findByTransactionHash(hash);
  }
}
