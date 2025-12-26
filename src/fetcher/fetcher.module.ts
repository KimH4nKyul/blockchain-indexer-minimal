import { Module } from '@nestjs/common';
import { BlockFetcher } from './application/block.fetcher';
import { BlockService } from './domain/service/block.service';
import { BlockRepository } from './domain/repository/block.repository';
import { BlockPrismaRepository } from './infrastructure/repository/block.prisma.repository';
import { BlockchainClient } from './domain/component/blockchain.client';
import { BlockchainViemClient } from './infrastructure/blockchain/blockchain.viem.client';
import { TransactionRepository } from './domain/repository/transaction.repository';
import { TransactionPrismaRepository } from './infrastructure/repository/transaction.prisma.repository';
import { ReceiptRepository } from './domain/repository/receipt.repository';
import { ReceiptPrismaRepository } from './infrastructure/repository/receipt.prisma.repository';

@Module({
  providers: [
    BlockFetcher,
    BlockService,
    {
      provide: BlockRepository,
      useClass: BlockPrismaRepository,
    },
    {
      provide: TransactionRepository,
      useClass: TransactionPrismaRepository,
    },
    {
      provide: ReceiptRepository,
      useClass: ReceiptPrismaRepository,
    },
    {
      provide: BlockchainClient,
      useClass: BlockchainViemClient,
    },
  ],
})
export class FetcherModule {}
