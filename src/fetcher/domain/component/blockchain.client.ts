import { Block } from '../block';

export abstract class BlockchainClient {
  abstract currentBlockNumber(): Promise<bigint>;
  abstract fetchBlock(blockNumber: bigint): Promise<Block>;
  abstract fetchBlocks(from: bigint, to: bigint): Promise<Block[]>;
  abstract fetchBlocksInParallel(from: bigint, to: bigint): Promise<Block[]>;
}
