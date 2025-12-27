import { Injectable } from '@nestjs/common';
import { BlockchainClient } from '../component/blockchain.client';
import { Block } from '../block';
import { BlockRepository } from '../repository/block.repository';
import { ConfigService } from '@nestjs/config';
import { TransactionRepository } from '../repository/transaction.repository';
import { Transaction } from '../transaction';

@Injectable()
export class BlockService {
  private readonly batchSize: bigint;
  private readonly safeStep: bigint;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainClient: BlockchainClient,
    private readonly blockRepository: BlockRepository,
    private readonly txRepository: TransactionRepository,
  ) {
    this.batchSize = BigInt(this.configService.get<number>('BATCH_SIZE') ?? 5);
    this.safeStep = BigInt(this.configService.get<number>('SAFE_STEP') ?? 10);
  }

  public async fetchBlock(): Promise<Block> {
    const latestBlockNumber = await this.blockchainClient.currentBlockNumber();
    return await this.blockchainClient.fetchBlock(latestBlockNumber);
  }

  // TODO: DB에 저장된 latestHeader와 블록체인의 currentHeader를 비교해 동기화된 상태인지 점검해야 한다. (Reorg 처리)
  // forwardSync는 DB에 저장된 마지막 블록과 블록체인의 현재 상태를 '일치'시키는 것이 목표이다.
  public async forwardSync(): Promise<number> {
    // 블록체인의 실제 현재 높이에 안전거리를 적용해 RPC 오응답 방지
    const currentBlockNumber = await this.blockchainClient.currentBlockNumber();
    const safeBlockNumber = currentBlockNumber - this.safeStep;

    // DB 마지막 블록 확인, 없으면 제니시스 또는 설정된 시작점
    const latestSyncedBlock = await this.blockRepository.latestBlock();

    const startBlockNumber = latestSyncedBlock
      ? latestSyncedBlock.number + 1n
      : safeBlockNumber;

    // 이미 동기화 완료된 상태라면 early return
    if (startBlockNumber > safeBlockNumber) {
      return 0;
    }

    // 범위 설정(Batching)
    let endBlockNumber = startBlockNumber + this.batchSize - 1n; // 이번에 가져올 범위의 끝 계산
    if (endBlockNumber > safeBlockNumber) {
      endBlockNumber = safeBlockNumber;
    }

    // 블록체인에서 블록 가져오기
    const blocks = await this.blockchainClient.fetchBlocksInParallel(
      startBlockNumber,
      endBlockNumber,
    );

    // DB에 배치 저장
    await this.blockRepository.saveBatch(blocks);

    // TODO: 한 블록 내에 트랜잭션 개수가 많기 때문에 나눠서 저장할 방안을 강구해야 한다.
    const transactions: Transaction[] = blocks.flatMap(
      (b) => b.transactions ?? [],
    );
    await this.txRepository.saveBatch(transactions);

    // 처리한 개수 반환
    return blocks.length;
  }
}
