import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FetcherModule } from './fetcher/fetcher.module';
import { PrismaModule } from '@shared/infrastructure';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    FetcherModule,
  ],
})
export class AppModule {}
