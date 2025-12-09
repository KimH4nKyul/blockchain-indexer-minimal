import { BlockchainClient } from '../port/blockchain/blockchain.client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BlockService {
  constructor(private readonly blockchainClient: BlockchainClient) {}

  public isAlive(): boolean {
    return this.blockchainClient.isConnected();
  }

  public async latestBlockNumber(): Promise<bigint> {
    return await this.blockchainClient.getBlockNumber();
  }
}
