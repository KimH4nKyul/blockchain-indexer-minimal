export interface IBlock {
  hash: string;
  number: bigint;
  timestamp: bigint;
  transactions: string[]; // 혹은 ITransaction[]
}

export interface ITransaction {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  input: string;
}

export interface ILog {
  address: string;
  topics: string[];
  data: string;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
}

export interface ITransactionReceipt {
  transactionHash: string;
  blockHash: string;
  blockNumber: bigint;
  from: string;
  to: string | null;
  gasUsed: bigint;
  status: 'success' | 'reverted';
  logs: ILog[];
}

export interface ILogFilter {
  fromBlock?: bigint;
  toBlock?: bigint;
  address?: string | string[];
  topics?: (string | string[] | null)[];
}

export abstract class BlockchainClient {
  /**
   *  클라이언트가 연결되었는지 확인
   */
  public abstract isConnected(): boolean;
  /**
   *  최신 블록 번호를 가져옴
   */
  public abstract getBlockNumber(): Promise<bigint>;
  /**
   *  블록 정보를 가져옴
   *  @param blockNumber 블록 번호
   */
  public abstract getBlock(blockNumber: bigint): Promise<IBlock | null>;
  /**
   *  블록 정보를 가져옴
   *  @param hash 트랜잭션 해시
   */
  public abstract getTransaction(hash: string): Promise<ITransaction | null>;
  /**
   *  로그 정보를 가져옴
   *  @param filter 로그 필터
   */
  public abstract getLogs(filter: ILogFilter): Promise<ILog[]>;
  /**
   *  트랜잭션 영수증 정보를 가져옴
   *  @param hash 트랜잭션 해시
   */
  public abstract getTransactionReceipt(
    hash: string,
  ): Promise<ITransactionReceipt | null>;
}
