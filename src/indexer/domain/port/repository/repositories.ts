import { Block } from '../../model/block.model';
import { Transaction } from '../../model/transaction.model';

export abstract class BlockRepository {
  public abstract save(block: Block): Promise<void>;
  public abstract findByNumber(number: bigint): Promise<Block | null>;
  public abstract findByHash(hash: string): Promise<Block | null>;
  public abstract findLatest(): Promise<Block | null>;
  public abstract findMany(take: number, skip?: number): Promise<Block[]>;
}

export abstract class TransactionRepository {
  public abstract save(transaction: Transaction): Promise<void>;
  public abstract findByHash(hash: string): Promise<Transaction | null>;
  public abstract findByBlockHash(blockHash: string): Promise<Transaction[]>;
  public abstract findMany(take: number, skip?: number): Promise<Transaction[]>;
}
