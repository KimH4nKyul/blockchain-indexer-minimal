import { Transaction } from '../transaction';

export abstract class TransactionRepository {
  abstract saveBatch(transactions: Transaction[]): Promise<void>;
}