import { Injectable } from '@nestjs/common';
import { BlockchainClient } from '../component/blockchain.client';
import { Block } from '../block';
import { BlockRepository } from '../repository/block.repository';

@Injectable()
export class BlockService {
  constructor(
    private readonly blockchainClient: BlockchainClient,
    private readonly blockRepository: BlockRepository,
  ) {}

  public async fetchBlock(): Promise<Block> {
    const latestBlockNumber = await this.blockchainClient.getBlockNumber();
    return await this.blockchainClient.getBlock(latestBlockNumber);
  }

  // TODO: DB에 저장된 latestHeader와 블록체인의 currentHeader를 비교해 동기화된 상태인지 점검해야 한다. (Reorg 처리)
  // forwardSync는 DB에 저장된 마지막 블록과 블록체인의 현재 상태를 '일치'시키는 것이 목표이다.
  public async forwardSync(): Promise<number> {
    // DB 마지막 블록 확인, 없으면 제니시스 또는 설정된 시작점
    const latestSyncedBlock = await this.blockRepository.latestBlock();
    const startBlockNumber = latestSyncedBlock
      ? latestSyncedBlock.number + 1n
      : 0n;

    // 블록체인의 실제 현재 높이
    const currentBlockNumber = await this.blockchainClient.getBlockNumber();

    // 이미 동기화 완료된 상태라면 early return
    if (startBlockNumber > currentBlockNumber) {
      return 0;
    }

    // 범위 설정(Batching)
    let endBlockNumber = startBlockNumber + 20n - 1n; // 이번에 가져올 범위의 끝 계산
    if (endBlockNumber > currentBlockNumber) {
      endBlockNumber = currentBlockNumber;
    }

    // 블록체인에서 블록 가져오기
    const blocks = await this.blockchainClient.getBlocks(
      startBlockNumber,
      endBlockNumber,
    );

    // DB에 배치 저장
    await this.blockRepository.saveBatch(blocks);

    // 처리한 개수 반환
    return blocks.length;
  }
}
