import { Log } from './log';

export interface ReceiptProps {
  readonly transactionHash: string;
  readonly blockHash: string;
  readonly blockNumber: bigint;
  readonly from: string;
  readonly to: string | null;
  readonly gasUsed: bigint;
  readonly status: 'success' | 'reverted';
  readonly logs: Log[];
  readonly createdAt?: Date;
}

export class Receipt {
  private constructor(private readonly props: ReceiptProps) {}

  public static from(props: ReceiptProps): Receipt {
    return new Receipt(props);
  }

  public toPrimitives(): ReceiptProps {
    return {
      transactionHash: this.props.transactionHash,
      blockHash: this.props.blockHash,
      blockNumber: this.props.blockNumber,
      from: this.props.from,
      to: this.props.to,
      gasUsed: this.props.gasUsed,
      status: this.props.status,
      logs: this.props.logs,
      createdAt: this.props.createdAt,
    };
  }

  get transactionHash(): string {
    return this.props.transactionHash;
  }

  get blockHash(): string {
    return this.props.blockHash;
  }

  get blockNumber(): bigint {
    return this.props.blockNumber;
  }

  get from(): string {
    return this.props.from;
  }

  get to(): string | null {
    return this.props.to;
  }

  get gasUsed(): bigint {
    return this.props.gasUsed;
  }

  get status(): 'success' | 'reverted' {
    return this.props.status;
  }

  get logs(): Log[] {
    return this.props.logs;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
}
