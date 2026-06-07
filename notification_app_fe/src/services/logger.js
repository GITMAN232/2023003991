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
    } catch (error) {
      // Non-blocking logging error: only log to console in development
      if (process.env.NODE_ENV === "development") {
        console.debug("Logger transport error:", error);
      }
      // Logging middleware must not break the user-facing notification flow
    }
  }

  info(event, details = {}) {
    // Fire-and-forget to prevent blocking UI
    return this.log("info", event, details).catch(() => {});
  }

  warn(event, details = {}) {
    return this.log("warn", event, details).catch(() => {});
  }

  error(event, details = {}) {
    return this.log("error", event, details).catch(() => {});
  }

  debug(event, details = {}) {
    return this.log("debug", event, details).catch(() => {});
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
