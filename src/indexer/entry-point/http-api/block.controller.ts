import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlockApplication } from '../../application/block.application';
import { Block } from '../../domain/model/block.model';
import { PaginationDto } from './dtos';

@Controller('blocks')
export class BlockController {
  constructor(private readonly blockApplication: BlockApplication) {}

  @Get()
  public async getBlocks(@Query() query: PaginationDto): Promise<Block[]> {
    const take = query.take ? Number(query.take) : 10;
    const skip = query.skip ? Number(query.skip) : 0;
    return await this.blockApplication.getBlocks(take, skip);
  }

  @Get(':hashOrNumber')
  public async getBlock(
    @Param('hashOrNumber') hashOrNumber: string,
  ): Promise<Block | null> {
    return await this.blockApplication.getBlock(hashOrNumber);
  }
}
