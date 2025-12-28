import { Transaction } from '../transaction';
import { Receipt } from '../receipt';

export abstract class TransactionRepository {
  public abstract saveReceipts(receipts: Receipt[]): Promise<number>;
  // TODO: 처리 건수를 기록할 수 있게 반환 명세를 변경해야 함
  public abstract saveBatch(transactions: Transaction[]): Promise<void>;
  public abstract findWithoutReceipt(): Promise<Transaction[]>;
}
