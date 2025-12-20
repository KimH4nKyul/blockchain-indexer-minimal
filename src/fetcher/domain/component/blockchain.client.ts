import { Block } from '../block';

export abstract class BlockchainClient {
  abstract getBlockNumber(): Promise<bigint>;
  abstract getBlock(blockNumber: bigint): Promise<Block>;
  abstract getBlocks(from: bigint, to: bigint): Promise<Block[]>;
}
