import { Injectable } from '@nestjs/common';
import { BlockService } from '../domain/service/block.service';

@Injectable()
export class BlockApplication {
  constructor(private readonly blockService: BlockService) {}

  public status(): boolean {
    return this.blockService.isAlive();
  }

  public async latestBlockNumber(): Promise<bigint> {
    return await this.blockService.latestBlockNumber();
  }
}
