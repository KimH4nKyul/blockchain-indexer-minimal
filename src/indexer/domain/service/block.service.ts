import { BlockchainClient } from '../port/blockchain/blockchain.client';
import { Injectable } from '@nestjs/common';
import { BlockRepository } from '../port/repository/repositories';
import { Block } from '../model/block.model';

@Injectable()
export class BlockService {
  constructor(
    private readonly blockchainClient: BlockchainClient,
    private readonly blockRepository: BlockRepository,
  ) {}

  public isAlive(): boolean {
    return this.blockchainClient.isConnected();
  }

  public async latestBlockNumber(): Promise<bigint> {
    return await this.blockchainClient.getBlockNumber();
  }

  public async getBlocks(take: number, skip: number): Promise<Block[]> {
    return await this.blockRepository.findMany(take, skip);
  }

  public async getBlockByNumber(number: bigint): Promise<Block | null> {
    return await this.blockRepository.findByNumber(number);
  }

  public async getBlockByHash(hash: string): Promise<Block | null> {
    return await this.blockRepository.findByHash(hash);
  }
}
