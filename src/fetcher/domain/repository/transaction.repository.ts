import { Transaction } from '../transaction';

export abstract class TransactionRepository {
  public abstract saveBatch(transactions: Transaction[]): Promise<void>;
  public abstract findWithoutReceipt(): Promise<Transaction[]>;
}
