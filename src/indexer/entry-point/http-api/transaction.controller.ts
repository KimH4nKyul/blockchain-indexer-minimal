import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionApplication } from '../../application/transaction.application';
import { Transaction } from '../../domain/model/transaction.model';
import { TransactionReceipt } from '../../domain/model/transaction-receipt.model';
import { PaginationDto } from './dtos';

@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactionApplication: TransactionApplication,
  ) {}

  @Get()
  public async getTransactions(
    @Query() query: PaginationDto,
  ): Promise<Transaction[]> {
    const take = query.take ? Number(query.take) : 10;
    const skip = query.skip ? Number(query.skip) : 0;
    return await this.transactionApplication.getTransactions(take, skip);
  }

  @Get(':hash')
  public async getTransaction(
    @Param('hash') hash: string,
  ): Promise<Transaction | null> {
    return await this.transactionApplication.getTransaction(hash);
  }

  @Get(':hash/receipt')
  public async getTransactionReceipt(
    @Param('hash') hash: string,
  ): Promise<TransactionReceipt | null> {
    return await this.transactionApplication.getTransactionReceipt(hash);
  }
}
