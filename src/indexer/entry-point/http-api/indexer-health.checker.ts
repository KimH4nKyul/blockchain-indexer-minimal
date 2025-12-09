import {Controller, Get} from "@nestjs/common";
import {BlockApplication} from "../../application/block.application";

@Controller()
export class IndexerHealthChecker {
  constructor(private readonly blockService: BlockApplication) {
  }

  @Get('/status')
  public status(): boolean {
    return this.blockService.status();
  }

  @Get('/block/latest')
  public async latestBlockNumber(): Promise<string> {
    const number: bigint = await this.blockService.latestBlockNumber();
    return number.toString();
  }
}
