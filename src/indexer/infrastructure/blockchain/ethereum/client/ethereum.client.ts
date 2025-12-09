import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sepolia } from 'viem/chains';
import {
  createPublicClient,
  fallback,
  http,
  PublicClient,
  webSocket,
  Address,
  Hex,
} from 'viem';
import {
  BlockchainClient,
  IBlock,
  ITransaction,
  ILog,
  ITransactionReceipt,
  ILogFilter,
} from '../../../../domain/port/blockchain/blockchain.client';

@Injectable()
export class EthereumClient extends BlockchainClient implements OnModuleInit {
  private client: PublicClient;
  private connectionStatus: boolean;
  private logger = new Logger(EthereumClient.name);

  constructor() {
    super();
  }

  public async getBlockNumber(): Promise<bigint> {
    return await this.client.getBlockNumber({ cacheTime: 1000 });
  }

  public async getBlock(blockNumber: bigint): Promise<IBlock | null> {
    try {
      const block = await this.client.getBlock({ blockNumber });
      if (!block) return null;
      return {
        hash: block.hash,
        number: block.number,
        timestamp: block.timestamp,
        transactions: block.transactions as string[],
      };
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  public async getTransaction(hash: string): Promise<ITransaction | null> {
    try {
      const transaction = await this.client.getTransaction({
        hash: hash as `0x${string}`,
      });

      if (!transaction) return null;

      return {
        hash: transaction.hash,
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        input: transaction.input,
      };
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }

  public async getLogs(filter: ILogFilter): Promise<ILog[]> {
    try {
      const viemFilter = {
        address: filter.address as Address | Address[] | undefined,
        topics: filter.topics as (Hex | Hex[] | null)[] | undefined,
        fromBlock: filter.fromBlock,
        toBlock: filter.toBlock,
      };

      const logs = await this.client.getLogs(viemFilter);

      return logs.map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      }));
    } catch (error) {
      this.logger.error(`Error fetching logs:`, error);
      return [];
    }
  }

  public async getTransactionReceipt(
    hash: string,
  ): Promise<ITransactionReceipt | null> {
    try {
      const receipt = await this.client.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      if (!receipt) return null;

      const logs: ILog[] = receipt.logs.map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      }));

      return {
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed,
        status: receipt.status === 'success' ? 'success' : 'reverted',
        logs,
      };
    } catch (error) {
      this.logger.error(`Error fetching transaction receipt ${hash}:`, error);
      return null;
    }
  }

  public isConnected(): boolean {
    return this.connectionStatus;
  }

  onModuleInit(): void {
    const RPC_URL = process.env.RPC_URL || '';
    const WS_URL = process.env.WS_URL || '';
    this.logger.log(
      `initializing ethereum client... RPC: ${RPC_URL}, WS: ${WS_URL}`,
    );

    const transport = fallback([
      webSocket(WS_URL, {
        reconnect: {
          delay: 1000,
          attempts: 5,
        },
      }),
      http(RPC_URL),
    ]);

    this.client = createPublicClient({
      chain: sepolia,
      transport,
      pollingInterval: 4000,
    });

    this.connectionStatus = true;
  }
}
