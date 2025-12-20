import { Injectable, OnModuleInit } from '@nestjs/common';
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
  constructor(private readonly configService: ConfigService) {
    super();
  }

  private client: PublicClient;

  async getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber({ cacheTime: 0 });
  }

  public async getBlock(blockNumber: bigint): Promise<Block> {
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
  // TODO: batchSize 설정을 추가하여 안정성을 강화해야 한다. (선택: Nms 동안 요청을 모아 보내는 wait 옵션)
  public async getBlocks(from: bigint, to: bigint): Promise<Block[]> {
    const blocks: Block[] = [];
    for (let i = from; i <= to; i++) {
      const block = await this.getBlock(i);
      blocks.push(block);
    }
    return blocks;
  }

  onModuleInit() {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    if (!rpcUrl) {
      throw new Error(
        '❌ Fatal Error: .env 파일에 "RPC_URL"이 설정되지 않았습니다.',
      );
    }

    // 블록을 배치로 가져올 수 있도록 배칭 활성화
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
  }
}
