export class Log {
  constructor(
    public readonly address: string,
    public readonly topics: string[], // Will be stringified/parsed for DB
    public readonly data: string,
    public readonly blockHash: string,
    public readonly transactionHash: string,
    public readonly logIndex: number,
    public readonly transactionReceiptId: string,
  ) {}
}
