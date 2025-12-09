export abstract class BlockchainClient {
  public abstract isConnected(): boolean;
  public abstract getBlockNumber(): Promise<bigint>;
}
