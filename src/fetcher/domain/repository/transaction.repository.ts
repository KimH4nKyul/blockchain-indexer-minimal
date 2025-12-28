import { Transaction } from '../transaction';
import { Receipt } from '../receipt';

export abstract class TransactionRepository {
  abstract saveBatch(transactions: Transaction[]): Promise<void>;

  abstract findWithoutReceipt(limit: number): Promise<Transaction[]>;

  abstract saveReceipts(receipts: Receipt[]): Promise<number>;
}
