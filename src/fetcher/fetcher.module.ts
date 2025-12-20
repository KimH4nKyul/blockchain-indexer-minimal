import { Module } from '@nestjs/common';
import { PrismaModule } from '@shared/infrastructure';
import { BlockFetcher } from './application/block.fetcher';
import { BlockService } from './domain/service/block.service';
import { BlockRepository } from './domain/repository/block.repository';
import { BlockPrismaRepository } from './infrastructure/repository/block.prisma.repository';
import { BlockchainClient } from './domain/component/blockchain.client';
import { BlockchainViemClient } from './infrastructure/blockchain/blockchain.viem.client';

@Module({
  imports: [PrismaModule],
  providers: [
    BlockFetcher,
    BlockService,
    {
      provide: BlockRepository,
      useClass: BlockPrismaRepository,
    },
    {
      provide: BlockchainClient,
      useClass: BlockchainViemClient,
    },
  ],
})
export class FetcherModule {}
