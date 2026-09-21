import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Reusable across every module from here on: `@UseGuards(JwtAuthGuard)`.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
