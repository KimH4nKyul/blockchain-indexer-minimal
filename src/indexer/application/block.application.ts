import { Injectable } from '@nestjs/common';
import { BlockService } from '../domain/service/block.service';
import { IndexerService } from '../domain/service/indexer.service';
import { Block } from '../domain/model/block.model';

@Injectable()
export class BlockApplication {
  constructor(
    private readonly blockService: BlockService,
    private readonly indexerService: IndexerService,
  ) {}

  public status(): boolean {
    return this.blockService.isAlive();
  }

  public async latestBlockNumber(): Promise<bigint> {
    return await this.blockService.latestBlockNumber();
  }

  public async syncBlock(from?: bigint, to?: bigint): Promise<void> {
    await this.indexerService.index(from, to);
  }

  public async getBlocks(take: number, skip: number): Promise<Block[]> {
    return await this.blockService.getBlocks(take, skip);
  }

  public async getBlock(hashOrNumber: string): Promise<Block | null> {
    if (hashOrNumber.startsWith('0x')) {
      return await this.blockService.getBlockByHash(hashOrNumber);
    } else {
      return await this.blockService.getBlockByNumber(BigInt(hashOrNumber));
    }
  }
}
