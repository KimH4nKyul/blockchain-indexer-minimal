import { Log } from './log';
import { Receipt } from './receipt';

export interface TransactionProps {
  readonly hash: string;
  readonly from: string;
  readonly to: string | null;
  readonly value: string;
  readonly input: string;
  readonly blockHash: string;

  readonly createdAt?: Date;

  readonly receipt?: Receipt;
  readonly logs: Log[];
}

export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  public static from(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  public toPrimitives(): TransactionProps {
    return {
      hash: this.props.hash,
      from: this.props.from,
      to: this.props.to,
      value: this.props.value,
      input: this.props.input,
      blockHash: this.props.blockHash,
      receipt: this.props.receipt,
      logs: this.props.logs,
      createdAt: this.props.createdAt,
    };
  }

  get hash(): string {
    return this.props.hash;
  }

  get from(): string {
    return this.props.from;
  }

  get to(): string | null {
    return this.props.to;
  }

  get value(): string {
    return this.props.value;
  }

  get input(): string {
    return this.props.input;
  }

  get blockHash(): string {
    return this.props.blockHash;
  }

  get receipt(): Receipt | undefined {
    return this.props.receipt;
  }

  get logs(): Log[] {
    return this.props.logs;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
}
