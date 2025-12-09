export abstract class BlockchainClient {
  public abstract isConnected(): Promise<boolean>;
}