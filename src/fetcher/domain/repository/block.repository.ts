import { Block } from '../block';

export abstract class BlockRepository {
  public abstract latestBlock(): Promise<Block | null>;
  public abstract saveBatch(blocks: Block[]): Promise<void>;
}
