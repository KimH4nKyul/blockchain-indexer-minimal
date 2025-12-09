export class Transaction {
  constructor(
    public readonly hash: string,
    public readonly from: string,
    public readonly to: string | null,
    public readonly value: bigint,
    public readonly input: string,
    public readonly blockHash: string,
  ) {}
}
