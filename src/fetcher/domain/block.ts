export interface BlockProps {
  // 1. 식별자 (Identity)
  readonly number: bigint; // 블록 높이 (Height) - 정렬 및 조회 핵심
  readonly hash: string; // 블록 해시 (Unique ID) - 데이터 무결성 보장

  // 2. 체인 연결성 (Lineage & Integrity)
  readonly parentHash: string; // 부모 블록 해시 - Reorg(체인 분기) 감지용 필수

  // 3. 시간 (Temporal)
  readonly timestamp: Date; // 블록 생성 시간 - 시계열 분석, UI 표시에 필수

  // 4. 통계 및 메타데이터 (Stats)
  readonly miner: string; // 채굴자/검증자 (feeRecipient) - 보상 추적
  readonly transactionCount: number; // 트랜잭션 개수 - 블록 활성도 파악 (Join 없이 조회하기 위해 필수)

  // 5. 네트워크 부하 (Load)
  readonly gasUsed: bigint; // 실제 사용된 가스 - 네트워크 혼잡도 분석
  readonly gasLimit: bigint; // 가스 한도 - 블록 용량 파악

  readonly createdAt?: Date;
}

export class Block {
  private constructor(private readonly props: BlockProps) {
    if (this.props.transactionCount < 0) {
      throw new Error('Transaction count must be greater than 0');
    }
  }

  public static from(props: BlockProps): Block {
    return new Block(props);
  }

  public isParentOf(otherBlock: Block): boolean {
    return this.hash === otherBlock.parentHash;
  }

  public toPrimitives(): BlockProps {
    return {
      number: this.props.number,
      hash: this.props.hash,
      parentHash: this.props.parentHash,
      timestamp: this.props.timestamp,
      miner: this.props.miner,
      transactionCount: this.props.transactionCount,
      gasUsed: this.props.gasUsed,
      gasLimit: this.props.gasLimit,
      createdAt: this.props.createdAt,
    };
  }

  get number(): bigint {
    return this.props.number;
  }

  get hash(): string {
    return this.props.hash;
  }

  get parentHash(): string {
    return this.props.parentHash;
  }
}
