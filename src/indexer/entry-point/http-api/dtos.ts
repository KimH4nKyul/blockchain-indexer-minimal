export class PaginationDto {
  take: number;
  skip: number;
}

export class LogFilterDto extends PaginationDto {
  address?: string;
  topic0?: string;
  fromBlock?: string;
  toBlock?: string;
  transactionHash?: string;
}
