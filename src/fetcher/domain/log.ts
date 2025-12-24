export interface LogProps {
  readonly id: number;
  readonly address: string;
  readonly topics: string[]; // Stored as JSON string in DB
  readonly data: string;
  readonly blockHash: string;
  readonly transactionHash: string;
  readonly logIndex: number;
  readonly transactionReceiptId: string;
  readonly createdAt: Date;
}

export class Log {
  private constructor(private readonly props: LogProps) {}

  public static from(props: LogProps): Log {
    return new Log(props);
  }

  public toPrimitives(): LogProps {
    return {
      id: this.props.id,
      address: this.props.address,
      topics: this.props.topics,
      data: this.props.data,
      blockHash: this.props.blockHash,
      transactionHash: this.props.transactionHash,
      logIndex: this.props.logIndex,
      transactionReceiptId: this.props.transactionReceiptId,
      createdAt: this.props.createdAt,
    };
  }

  get id(): number {
    return this.props.id;
  }

  get address(): string {
    return this.props.address;
  }

  get topics(): string[] {
    return this.props.topics;
  }

  get data(): string {
    return this.props.data;
  }

  get blockHash(): string {
    return this.props.blockHash;
  }

  get transactionHash(): string {
    return this.props.transactionHash;
  }

  get logIndex(): number {
    return this.props.logIndex;
  }

  get transactionReceiptId(): string {
    return this.props.transactionReceiptId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
