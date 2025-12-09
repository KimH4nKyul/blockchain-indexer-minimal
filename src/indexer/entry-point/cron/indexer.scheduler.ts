import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlockApplication } from '../../application/block.application';

@Injectable()
export class IndexerScheduler {
  private readonly logger = new Logger(IndexerScheduler.name);
  private isSyncing = false;

  constructor(private readonly blockApplication: BlockApplication) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    if (this.isSyncing) {
      this.logger.debug('Previous sync job is still running. Skipping...');
      return;
    }

    this.isSyncing = true;
    try {
      this.logger.debug('Starting scheduled sync job...');
      await this.blockApplication.syncBlock();
      this.logger.debug('Scheduled sync job finished.');
    } catch (error) {
      this.logger.error('Error during scheduled sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}
