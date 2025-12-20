import { Block } from '../../domain/block';
import { BlockRepository } from '../../domain/repository/block.repository';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure';

@Injectable()
export class BlockPrismaRepository extends BlockRepository {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  public async latestBlock(): Promise<Block | null> {
    const block = await this.prismaService.block.findFirst({
      orderBy: {
        number: 'desc',
      },
    });
    if (!block) return null;

    return Block.from(block);
  }

  public async saveBatch(blocks: Block[]): Promise<void> {
    if (blocks.length === 0) return;

    await this.prismaService.block.createMany({
      data: blocks.map((block) => block.toPrimitives()),
      skipDuplicates: true,
    });
  }
}
