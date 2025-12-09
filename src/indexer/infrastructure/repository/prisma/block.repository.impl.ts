import { Injectable } from '@nestjs/common';
import { BlockRepository } from '../../../domain/port/repository/repositories';
import { Block } from '../../../domain/model/block.model';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaBlockRepository extends BlockRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(block: Block): Promise<void> {
    await this.prisma.block.upsert({
      where: { hash: block.hash },
      update: {},
      create: {
        hash: block.hash,
        number: block.number,
        timestamp: block.timestamp,
      },
    });
  }

  public async findByNumber(number: bigint): Promise<Block | null> {
    const block = await this.prisma.block.findUnique({
      where: { number },
    });
    if (!block) return null;
    return new Block(block.hash, block.number, block.timestamp);
  }

  public async findByHash(hash: string): Promise<Block | null> {
    const block = await this.prisma.block.findUnique({
      where: { hash },
    });
    if (!block) return null;
    return new Block(block.hash, block.number, block.timestamp);
  }

  public async findLatest(): Promise<Block | null> {
    const block = await this.prisma.block.findFirst({
      orderBy: { number: 'desc' },
    });
    if (!block) return null;
    return new Block(block.hash, block.number, block.timestamp);
  }

  public async findMany(take: number, skip?: number): Promise<Block[]> {
    const blocks = await this.prisma.block.findMany({
      take,
      skip,
      orderBy: { number: 'desc' },
    });
    return blocks.map((b) => new Block(b.hash, b.number, b.timestamp));
  }
}
