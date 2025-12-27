import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../repository/transaction.repository';
import { Transaction } from '../transaction';

@Injectable()
export class TransactionService {
  constructor(private readonly txRepository: TransactionRepository) {}

  public async unreceiptedTransactions(): Promise<Transaction[]> {
    return await this.txRepository.findWithoutReceipt();
  }
}
