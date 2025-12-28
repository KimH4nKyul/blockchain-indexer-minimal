import { Block } from '../block';
import { Receipt } from '../receipt';
import { Transaction } from '../transaction';

export abstract class BlockchainClient {
  abstract currentBlockNumber(): Promise<bigint>;
  abstract fetchBlock(blockNumber: bigint): Promise<Block>;
  abstract fetchBlocks(from: bigint, to: bigint): Promise<Block[]>;
  abstract fetchBlocksInParallel(from: bigint, to: bigint): Promise<Block[]>;
  abstract fetchReceipt(txHash: string): Promise<Receipt>;
  abstract fetchReceiptsInParallel(
    transactions: Transaction[],
  ): Promise<Receipt[]>;
}
