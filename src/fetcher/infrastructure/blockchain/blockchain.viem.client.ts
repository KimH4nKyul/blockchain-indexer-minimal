import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BlockchainClient } from '../../domain/component/blockchain.client';
import { Block } from '../../domain/block';
import {
  createPublicClient,
  http,
  fallback,
  PublicClient,
  BlockNotFoundError,
} from 'viem';
import { sepolia } from 'viem/chains';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainViemClient
  extends BlockchainClient
  implements OnModuleInit
{
  private readonly logger: Logger = new Logger(BlockchainClient.name);
  private client: PublicClient;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async currentBlockNumber(retries = 3): Promise<bigint> {
    try {
      return await this.client.getBlockNumber({ cacheTime: 0 });
    } catch (error) {
      if (
        retries > 0 &&
        error instanceof TypeError &&
        error.message.includes('BigInt')
      ) {
        this.logger.warn(
          `⚠️ RPC Node returned bad response for blockNumber. Retrying... (${retries} attempts left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.currentBlockNumber(retries - 1);
      }
      throw error;
    }
  }

  public async fetchBlock(blockNumber: bigint, retries = 3): Promise<Block> {
    try {
      const block = await this.client.getBlock({
        blockNumber,
        includeTransactions: true,
      });

      return Block.from({
        ...block,
        timestamp: new Date(Number(block.timestamp) * 1000),
        transactionCount: block.transactions.length,
      });
    } catch (error) {
      if (retries > 0) {
        if (
          error instanceof BlockNotFoundError ||
          (error instanceof TypeError && error.message.includes('BigInt'))
        ) {
          this.logger.warn(
            `⚠️ Failed to fetch block ${blockNumber}. Retrying... (${retries} attempts left)`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.fetchBlock(blockNumber, retries - 1);
        }
      }
      throw error;
    }
  }

  public async fetchBlocks(from: bigint, to: bigint): Promise<Block[]> {
    const blocks: Block[] = [];
    for (let i = from; i <= to; i++) {
      const block = await this.fetchBlock(i);
      blocks.push(block);
    }
    return blocks;
  }

  public async fetchBlocksInParallel(
    from: bigint,
    to: bigint,
  ): Promise<Block[]> {
    const promises: Promise<Block>[] = [];
    for (let i = from; i <= to; i++) {
      promises.push(this.fetchBlock(i));
    }
    return await Promise.all(promises);
  }

  onModuleInit() {
    const rpcUrls = this.configService.get<string>('RPC_URLS');
    if (!rpcUrls) {
      throw new Error('❌ RPC URLS not found');
    }
    const rpcUrlList = rpcUrls.split(',').map((url) => url.trim());
    const batchSize = this.configService.get<number>('BATCH_SIZE') ?? 5;

    // 각 URL 마다 동일한 배치/재시도 설정을 가진 http transport 생성
    const transports = rpcUrlList.map((url) =>
      http(url, {
        batch: { batchSize, wait: 100 },
        retryCount: 1, // 빠른 Failover를 위해 재시도 횟수 축소 (2 -> 1)
        retryDelay: 2000,
      }),
    );

    this.client = createPublicClient({
      chain: sepolia,
      transport: fallback(transports, {
        rank: true, // 응답 속도가 빠른 RPC를 우선적으로 사용
      }),
    });
  }
}
