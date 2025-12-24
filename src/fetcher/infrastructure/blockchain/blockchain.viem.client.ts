import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BlockchainClient } from '../../domain/component/blockchain.client';
import { Block } from '../../domain/block';
import { createPublicClient, http, PublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { ConfigService } from '@nestjs/config';

// TODO: infura API 호출 한도에 도달할 경우 Alchemy나 QuickNode API를 이용하도록 Failover를 설정해야 한다.
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

  async currentBlockNumber(): Promise<bigint> {
    try {
      return await this.client.getBlockNumber({ cacheTime: 0 });
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('BigInt')) {
        this.logger.warn(
          `⚠️ RPC Node returned bad response for blockNumber. Retrying...`,
        );
      }
      throw error;
    }
  }

  public async fetchBlock(blockNumber: bigint): Promise<Block> {
    const block = await this.client.getBlock({
      blockNumber,
      includeTransactions: true,
    });

    return Block.from({
      ...block,
      timestamp: new Date(Number(block.timestamp) * 1000),
      transactionCount: block.transactions.length,
    });
  }

  // viem은 짧은 시간(이벤트 루프의 한 틱) 동안 발생하는 여러 개의 요청을 감지해
  // 자동으로 JSON-RPC Batch Request로 묶어 전송한다.
  // 요청하려는 블록 범위(to - from)가 매우 클 경우, RPC 제공자가 요청이 너무 크다며 거부할 수 있다.
  // TODO: batchSize 설정을 추가하여 안정성을 강화해야 한다. (선택: Nms 동안 요청을 모아 보내는 wait 옵션) => Infura에서 너무 많은 요청과 깊은 페이로드로 인해 차단
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
    const rpcUrl = this.configService.get<string>('RPC_URL');
    if (!rpcUrl) {
      throw new Error(
        '❌ Fatal Error: .env 파일에 "RPC_URL"이 설정되지 않았습니다.',
      );
    }

    // 블록을 배치로 가져올 수 있도록 배칭 활성화
    const batchSize = this.configService.get<number>('BATCH_SIZE') ?? 5;
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl, {
        batch: { batchSize, wait: 50 },
        retryCount: 2,
        retryDelay: 2000,
      }),
    });
  }
}
