import {Controller, Get} from "@nestjs/common";
import {BlockApplication} from "../../application/block.application";

@Controller()
export class IndexerHealthChecker {
  constructor(private readonly blockService: BlockApplication) {
  }

  @Get('/health')
  public async isAlive(): Promise<boolean> {
    return this.blockService.isConnected();
  }
}