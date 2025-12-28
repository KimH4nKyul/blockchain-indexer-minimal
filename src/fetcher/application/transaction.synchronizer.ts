import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { TransactionService } from '../domain/service/transactoin.service';

@Injectable()
export class TransactionSynchronizer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(TransactionSynchronizer.name);
  private isRunning: boolean = false;

  constructor(private readonly txService: TransactionService) {}

  onModuleDestroy() {
    this.logger.log('👋 Good-bye!');
    this.isRunning = false;
  }

  onApplicationBootstrap() {
    this.isRunning = true;
    this.logger.log('🚀 Transaction Synchronizer initialized');

    const loop = async () => {
      // isRunning이 false라면 즉시 리턴해 루프를 종료한다.
      if (!this.isRunning) {
        this.logger.warn('‼️ Close transaction sync loop cause not running');
        return;
      }

      try {
        const txsWithoutReceipt =
          await this.txService.unreceiptedTransactions();

        if (txsWithoutReceipt.length === 0) {
          this.logger.log(
            '💤 No unreceipted transactions found. Waiting for next poll...',
          );
          setTimeout(() => {
            void loop();
          }, 9000);
        } else {
          const processedCount =
            await this.txService.receiptSync(txsWithoutReceipt);
          this.logger.log(
            `✅ Synced ${processedCount} of ${txsWithoutReceipt.length} transactions`,
          );

          setTimeout(() => {
            void loop();
          }, 3000);
        }
      } catch (error) {
        this.logger.error('❌ Error in transaction sync loop:', error);
        setTimeout(() => {
          void loop();
        }, 15000);
      }
    };

    void loop();
  }
}
