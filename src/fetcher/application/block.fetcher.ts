import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { BlockService } from '../domain/service/block.service';

// TODO: BlockFetcher는 사용자 UX를 위해 실시간성을 챙기고, CanonicalBlockFetcher를 별도로 두어 안정적으로 시스템을 운영해야 한다.
// TODO: 동기화 중에 RPC 노드에 아직 전파되지 못한 최신 블록을 가져오는 시도로 에러가 발생하기 때문에 SAFE_STEP 도입 고려해 봐야 한다.
@Injectable()
export class BlockFetcher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BlockFetcher.name);
  private isRunning: boolean = false;

  constructor(private readonly blockService: BlockService) {}

  onModuleDestroy() {
    this.logger.log('👋 Good-bye!');
    this.isRunning = false;
  }

  // Node.js의 싱글 스레드 이벤트 루프를 차단하지 않으면서도, 블록이 많을 때는 빠르게, 없을 때는 리소스를 아끼며 동작하는 Fetcher가 되어야 한다.
  // 과거에 고려했던 것은 NestJS에서 제공하는 @Cron와 @Interval 이었다.
  onApplicationBootstrap() {
    this.isRunning = true;
    this.logger.log('🚀 Block fetcher initialized');

    const loop = async () => {
      // isRunning이 false라면 즉시 리턴해 루프를 종료한다.
      if (!this.isRunning) {
        this.logger.warn('‼️ Close block fetcher loop cause not running');
        return;
      }

      try {
        // 다음에 처리할 블록이 있는지 확인하고 가져오는 비즈니스 로직은 서비스에 위임한다.
        const processedCount = await this.blockService.forwardSync();

        // 아직 동기화할 블록이 남아있다면 즉시 다음 루프를 예약한다.
        // I/O 대기 없이 빠르게 처리하되, 이벤트 루프에 제어권을 잠시 반환해 다른 작업이 끼어들 수 있게 구현했다.
        if (processedCount > 0) {
          this.logger.log(`✅ Synced ${processedCount} blocks`);
          // RPC 노드 과부하 방지를 위해 배치 처리 사이에 1초의 지연(Throttling)을 둡니다.
          setTimeout(() => {
            void loop();
          }, 1000);
        } else {
          this.logger.log('💤 No new blocks found. Waiting for next poll...');
          // 더 이상 가져올 블록이 없다면 일정 시간 대기 후 재귀 호출한다. 이것이 폴링 간격이 된다.
          // setTimeout으로 처리할 블록이 없거나 에러 발생 시에 대기 시간을 두어 리소스를 절약하고 API 부하를 줄였다.
          setTimeout(() => {
            void loop();
          }, 3000); // TODO: 이더리움의 블록 생성 시간 / 4 만큼으로 설정해 UX를 위해 빠른 속도로 블록을 저장하도록 한다. (1초는 너무 잦은 요청으로 RPC 비용 증가)
          // TODO: 추후 실제 트랜잭션 내역을 반영하기 위해 CanonicalBlockFetcher 에서 한 블록 생성 주기인 12초로 설정해 Reorg 방지 + 안정적 운영 지원
        }
      } catch (error) {
        this.logger.error('❌ Error in block fetcher loop:', error);
        // 재귀 루프에서 에러가 발생하면 프로세스가 죽거나 루프가 끊길 수 있기에 방어 코드가 필요했다.
        // 정상 대기 시간보다 조금 더 길게 잡아 인덱서가 멈추지 않고 다시 시도되게 했다.
        setTimeout(() => {
          void loop();
        }, 12000);
      }
    };

    void loop();
  }
}
