export interface LogProps {
  readonly id?: bigint;
  readonly address: string;
  readonly topics: string[]; // Stored as JSON string in DB
  readonly data: string;
  readonly blockHash: string;
  readonly transactionHash: string;
  readonly logIndex: number;
  readonly createdAt?: Date;
}

export class Log {
  private constructor(private readonly props: LogProps) {}

  public static from(props: LogProps): Log {
    return new Log(props);
  }

  public toPrimitives(): LogProps {
    return {
      id: this.props.id ?? undefined,
      address: this.props.address,
      topics: this.props.topics,
      data: this.props.data,
      blockHash: this.props.blockHash,
      transactionHash: this.props.transactionHash,
      logIndex: this.props.logIndex,
      createdAt: this.props.createdAt ?? new Date(),
    };
  }

  get id(): bigint | undefined {
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

  get createdAt(): Date | undefined{
    return this.props.createdAt;
  }
}
