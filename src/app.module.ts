import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FetcherModule } from './fetcher/fetcher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FetcherModule,
  ],
})
export class AppModule {}
