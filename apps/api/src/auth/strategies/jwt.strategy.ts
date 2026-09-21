import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET")!,
    });
  }

  // passport-jwt has already verified the signature and expiry by the
  // time this runs — no DB lookup here, see jwt-payload.interface.ts.
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
