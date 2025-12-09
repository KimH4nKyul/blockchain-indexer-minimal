import { Module } from '@nestjs/common';
import { EthereumClient } from './infrastructure/blockchain/ethereum/client/ethereum.client';
import { IndexerHealthChecker } from './entry-point/http-api/indexer-health.checker';
import { BlockchainClient } from './domain/port/blockchain/blockchain.client';
import { BlockApplication } from './application/block.application';
import { BlockService } from './domain/service/block.service';

@Module({
  controllers: [IndexerHealthChecker],
  providers: [
    BlockApplication,
    BlockService,
    {
      provide: BlockchainClient,
      useClass: EthereumClient,
    },
  ],
})
export class IndexerModule {}
