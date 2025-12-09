import {Injectable} from "@nestjs/common";
import {BlockchainClient} from "../domain/port/blockchain/blockchain.client";

@Injectable()
export class BlockApplication {
  constructor(private readonly blockchainClient: BlockchainClient) {}

  public async isConnected(): Promise<boolean> {
    return this.blockchainClient.isConnected();
  }
}