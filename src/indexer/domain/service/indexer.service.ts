import { Injectable } from '@nestjs/common';
import { BlockchainClient } from '../port/blockchain/blockchain.client';
import {
  BlockRepository,
  TransactionRepository,
} from '../port/repository/repositories';
import { Block } from '../model/block.model';
import { Transaction } from '../model/transaction.model';
import { LoggerPort } from '../port/logger/logger.port';

@Injectable()
export class IndexerService {
  constructor(
    private readonly logger: LoggerPort,
    private readonly blockchainClient: BlockchainClient,
    private readonly blockRepository: BlockRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  public async index(fromBlock?: bigint, toBlock?: bigint): Promise<void> {
    const latestOnChain = await this.blockchainClient.getBlockNumber();
    let currentBlock = fromBlock;

    if (currentBlock === undefined) {
      const latestInDb = await this.blockRepository.findLatest();
      currentBlock = latestInDb ? latestInDb.number + 1n : latestOnChain - 10n; // Default to last 10 blocks if empty
    }

    const endBlock = toBlock || latestOnChain;

    this.logger.log(`Starting indexing from ${currentBlock} to ${endBlock}`);

    for (let i = currentBlock; i <= endBlock; i++) {
      await this.indexBlock(i);
    }
  }

  private async indexBlock(blockNumber: bigint): Promise<void> {
    try {
      this.logger.log(`Indexing block ${blockNumber}...`);
      const blockData = await this.blockchainClient.getBlock(blockNumber);
      if (!blockData) {
        this.logger.warn(`Block ${blockNumber} not found on chain.`);
        return;
      }

      // Save Block
      const block = new Block(
        blockData.hash,
        blockData.number,
        blockData.timestamp,
      );
      await this.blockRepository.save(block);

      // Save Transactions
      // Note: blockData.transactions is string[] in IBlock interface currently
      // But if getBlock returns full transactions, we can use them.
      // The current implementation of EthereumClient.getBlock returns string[] for transactions.
      // So we need to fetch each transaction.
      // Optimization: Update EthereumClient to return full transaction objects if possible, or fetch them here.
      // For now, let's fetch them one by one (inefficient but works for "minimal").

      for (const txHash of blockData.transactions) {
        const txData = await this.blockchainClient.getTransaction(txHash);
        if (txData) {
          const transaction = new Transaction(
            txData.hash,
            txData.from,
            txData.to,
            txData.value,
            txData.input,
            block.hash,
          );
          await this.transactionRepository.save(transaction);
        }
      }

      this.logger.log(
        `Indexed block ${blockNumber} with ${blockData.transactions.length} txs.`,
      );
    } catch (error) {
      this.logger.error(`Error indexing block ${blockNumber}: ${error}`);
    }
  }
}
