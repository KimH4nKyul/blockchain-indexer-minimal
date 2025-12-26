import { ReceiptRepository } from '../../domain/repository/receipt.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReceiptPrismaRepository extends ReceiptRepository {}
