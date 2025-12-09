export class Block {
  constructor(
    public readonly hash: string,
    public readonly number: bigint,
    public readonly timestamp: bigint,
  ) {}
}
