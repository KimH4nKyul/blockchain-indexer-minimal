import { Module } from '@nestjs/common';
import { EthereumClient } from './infrastructure/blockchain/ethereum/client/ethereum.client';
import { IndexerHealthChecker } from './entry-point/http-api/indexer-health.checker';
import { BlockController } from './entry-point/http-api/block.controller';
import { TransactionController } from './entry-point/http-api/transaction.controller';
import { LogController } from './entry-point/http-api/log.controller';
import { BlockchainClient } from './domain/port/blockchain/blockchain.client';
import { BlockApplication } from './application/block.application';
import { TransactionApplication } from './application/transaction.application';
import { LogApplication } from './application/log.application';
import { BlockService } from './domain/service/block.service';
import { TransactionService } from './domain/service/transaction.service';
import { LogService } from './domain/service/log.service';
import { IndexerService } from './domain/service/indexer.service';
import { PrismaService } from './infrastructure/repository/prisma/prisma.service';
import {
  BlockRepository,
  TransactionRepository,
} from './domain/port/repository/repositories';
import { LogRepository } from './domain/port/repository/log.repository';
import { TransactionReceiptRepository } from './domain/port/repository/transaction-receipt.repository';
import { PrismaBlockRepository } from './infrastructure/repository/prisma/block.repository.impl';
import { PrismaTransactionRepository } from './infrastructure/repository/prisma/transaction.repository.impl';
import { PrismaLogRepository } from './infrastructure/repository/prisma/log.repository.impl';
import { PrismaTransactionReceiptRepository } from './infrastructure/repository/prisma/transaction-receipt.repository.impl';
import { LoggerPort } from './domain/port/logger/logger.port';
import { NestLoggerAdapter } from './infrastructure/logger/nest.logger';
import { IndexerScheduler } from './entry-point/cron/indexer.scheduler';

@Module({
  controllers: [
    IndexerHealthChecker,
    BlockController,
    TransactionController,
    LogController,
  ],
  providers: [
    BlockApplication,
    TransactionApplication,
    LogApplication,
    BlockService,
    TransactionService,
    LogService,
    IndexerService,
    PrismaService,
    IndexerScheduler,
    {
      provide: BlockchainClient,
      useClass: EthereumClient,
    },
    {
      provide: BlockRepository,
      useClass: PrismaBlockRepository,
    },
    {
      provide: TransactionRepository,
      useClass: PrismaTransactionRepository,
    },
    {
      provide: LogRepository,
      useClass: PrismaLogRepository,
    },
    {
      provide: TransactionReceiptRepository,
      useClass: PrismaTransactionReceiptRepository,
    },
    {
      provide: LoggerPort,
      useClass: NestLoggerAdapter,
    },
  ],
})
export class IndexerModule {}
