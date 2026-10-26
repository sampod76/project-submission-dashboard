import type { DateTime } from "./common.types";

export interface HealthResult {
  status: "ok";
  time: DateTime;
}

export type HealthResponse = HealthResult;
