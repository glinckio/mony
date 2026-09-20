import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

class HealthResponseDto {
  status!: "ok";
  timestamp!: string;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Liveness probe for the API" })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
