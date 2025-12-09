import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from "@nestjs/common";
import { sepolia } from "viem/chains";
import {createPublicClient, fallback, http, PublicClient, webSocket} from "viem";
import {BlockchainClient} from "../../../../domain/port/blockchain/blockchain.client";

@Injectable()
export class EthereumClient extends BlockchainClient implements OnModuleInit, OnModuleDestroy {
  private client: PublicClient;
  private connectionStatus: boolean;
  private logger = new Logger(EthereumClient.name);

  constructor() {
    super();
  }

  public async isConnected(): Promise<boolean> {
    return this.connectionStatus;
  }

  async onModuleInit(): Promise<void> {

    const RPC_URL = process.env.RPC_URL || "";
    const WS_URL = process.env.WS_URL || "";
    this.logger.log(`initializing ethereum client... RPC: ${RPC_URL}, WS: ${WS_URL}`);

    const transport = fallback([
      webSocket(WS_URL, {
        reconnect: {
          delay: 1000,
          attempts: 5,
        },
      }),
      http(RPC_URL),
    ])

    this.client = createPublicClient({
      chain: sepolia,
      transport,
      pollingInterval: 4000,
    })

    this.connectionStatus = true;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log(`destroy ethereum client...`)
  }
}