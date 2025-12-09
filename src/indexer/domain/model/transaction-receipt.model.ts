import { Log } from './log.model';

export class TransactionReceipt {
  constructor(
    public readonly transactionHash: string,
    public readonly blockHash: string,
    public readonly blockNumber: bigint,
    public readonly from: string,
    public readonly to: string | null,
    public readonly gasUsed: bigint,
    public readonly status: 'success' | 'reverted',
    public readonly logs: Log[],
  ) {}
}
