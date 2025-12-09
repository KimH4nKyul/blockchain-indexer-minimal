import { TransactionReceipt as TransactionReceiptModel } from '../../model/transaction-receipt.model';

export abstract class TransactionReceiptRepository {
  public abstract save(receipt: TransactionReceiptModel): Promise<void>;
  public abstract findByTransactionHash(
    transactionHash: string,
  ): Promise<TransactionReceiptModel | null>;
  public abstract findByBlockHash(
    blockHash: string,
  ): Promise<TransactionReceiptModel[]>;
}
