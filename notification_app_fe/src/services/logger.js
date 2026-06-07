import { postLog } from "./api";

const DEFAULT_LOG_CONTEXT = {
  service: "notification_app_fe",
  stage: "stage_1",
};

export class StructuredLogger {
  constructor({ transport = postLog, context = DEFAULT_LOG_CONTEXT } = {}) {
    this.transport = transport;
    this.context = context;
  }

  async log(level, event, details = {}) {
    const logEntry = {
      level,
      event,
      message: event,
      context: this.context,
      details,
    };

    try {
      await this.transport(logEntry);
    } catch {
      // Logging middleware must not break the user-facing notification flow.
    }
  }

  info(event, details = {}) {
    return this.log("info", event, details);
  }

  warn(event, details = {}) {
    return this.log("warn", event, details);
  }

  error(event, details = {}) {
    return this.log("error", event, details);
  }
}

export const logger = new StructuredLogger();

export async function logClientEvent(event, details = {}, level = "info") {
  return logger.log(level, event, details);
}

export function toErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong while loading notifications."
  );
}
