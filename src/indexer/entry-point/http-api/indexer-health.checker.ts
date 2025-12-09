import { Controller, Get, Post, Query } from '@nestjs/common';
import { BlockApplication } from '../../application/block.application';

@Controller()
export class IndexerHealthChecker {
  constructor(private readonly blockService: BlockApplication) {}

  @Get('/status')
  public status(): boolean {
    return this.blockService.status();
  }

  @Get('/block/latest')
  public async latestBlockNumber(): Promise<string> {
    const number: bigint = await this.blockService.latestBlockNumber();
    return number.toString();
  }

  @Post('/sync')
  // eslint-disable-next-line @typescript-eslint/require-await
  public async sync(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<string> {
    const fromBlock = from ? BigInt(from) : undefined;
    const toBlock = to ? BigInt(to) : undefined;
    // Run in background
    void this.blockService.syncBlock(fromBlock, toBlock).catch(console.error);
    return 'Indexing started';
  }
}
