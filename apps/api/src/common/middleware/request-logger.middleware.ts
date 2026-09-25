import { Logger } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const logger = new Logger("HTTP");

// One line per request: method, path, status, duration, declared body size
// (useful for multipart uploads) and, on errors, the message the
// AllExceptionsFilter sent back. Never logs bodies, query strings or
// headers — they carry tokens and personal data (LGPD).
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const describe = () => {
    const length = req.headers["content-length"];
    const size = length ? ` ${length}B` : "";
    return `${req.method} ${req.path}${size}`;
  };

  res.on("finish", () => {
    const errorMessage = res.locals.errorMessage as string | undefined;
    const line = `${describe()} -> ${res.statusCode} ${Date.now() - start}ms${
      errorMessage ? ` — ${errorMessage}` : ""
    }`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });
  // Client gave up before we answered (timeout, app closed, dropped
  // connection mid-upload) — otherwise these vanish without a trace.
  res.on("close", () => {
    if (!res.writableFinished) {
      logger.warn(`${describe()} -> aborted by client after ${Date.now() - start}ms`);
    }
  });
  next();
}
