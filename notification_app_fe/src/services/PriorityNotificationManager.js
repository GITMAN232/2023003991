import {
  NOTIFICATION_PRIORITY,
  SUPPORTED_NOTIFICATION_TYPES,
} from "@/app/utils/notification-types";

function parseTimestamp(rawTimestamp) {
  if (!rawTimestamp) return Number.NaN;
  if (rawTimestamp instanceof Date) return rawTimestamp.getTime();

  const timestampText = String(rawTimestamp).trim();
  const normalizedTimestamp = timestampText.includes("T")
    ? timestampText
    : timestampText.replace(" ", "T");

  return new Date(normalizedTimestamp).getTime();
}

function getField(rawNotification, fieldNames) {
  return fieldNames.find((fieldName) => rawNotification?.[fieldName] !== undefined);
}

function getValue(rawNotification, fieldNames) {
  const fieldName = getField(rawNotification, fieldNames);
  return fieldName ? rawNotification[fieldName] : undefined;
}

function normalizeType(rawType) {
  const normalizedType = String(rawType).trim().toLowerCase();
  return SUPPORTED_NOTIFICATION_TYPES.find(
    (supportedType) => supportedType.toLowerCase() === normalizedType
  );
}

function isUnreadNotification(rawNotification) {
  const readValue = getValue(rawNotification, [
    "Read",
    "read",
    "IsRead",
    "isRead",
    "read_status",
    "status",
  ]);

  if (readValue === undefined || readValue === null) return true;
  if (typeof readValue === "boolean") return !readValue;
  if (typeof readValue === "number") return readValue === 0;

  const normalizedReadValue = String(readValue).toLowerCase().trim();
  if (["false", "0", "unread", "new"].includes(normalizedReadValue)) return true;
  if (["true", "1", "read", "seen"].includes(normalizedReadValue)) return false;

  return true;
}

function normalizeNotification(rawNotification) {
  const id = getValue(rawNotification, ["ID", "id", "notification_id"]);
  const type = getValue(rawNotification, [
    "Type",
    "type",
    "notification_type",
    "category",
  ]);
  const message = getValue(rawNotification, [
    "Message",
    "message",
    "description",
    "body",
    "content",
  ]);
  const timestamp = getValue(rawNotification, [
    "Timestamp",
    "timestamp",
    "created_at",
    "createdAt",
    "date",
  ]);
  const normalizedType = type ? normalizeType(type) : "";

  const missingFields = [];
  if (!id) missingFields.push("ID");
  if (!type) missingFields.push("Type");
  if (!message) missingFields.push("Message");
  if (!timestamp) missingFields.push("Timestamp");

  if (missingFields.length > 0) {
    return {
      error: "missing_fields",
      details: { missingFields },
    };
  }

  if (!normalizedType) {
    return {
      error: "unsupported_type",
      details: { type },
    };
  }

  const timestampMs = parseTimestamp(timestamp);
  if (Number.isNaN(timestampMs)) {
    return {
      error: "malformed_timestamp",
      details: { timestamp },
    };
  }

  return {
    value: {
      id: String(id),
      type: normalizedType,
      message: String(message),
      timestamp: String(timestamp),
      timestampMs,
      unread: isUnreadNotification(rawNotification),
      raw: rawNotification,
    },
  };
}

export function compareNotificationPriority(left, right) {
  const priorityDifference =
    NOTIFICATION_PRIORITY[left.type] - NOTIFICATION_PRIORITY[right.type];

  if (priorityDifference !== 0) return priorityDifference;
  if (left.timestampMs !== right.timestampMs) {
    return left.timestampMs - right.timestampMs;
  }

  return left.id.localeCompare(right.id);
}

class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(item) {
    this.items[0] = item;
    this.bubbleDown(0);
  }

  pop() {
    if (this.items.length === 0) return undefined;
    if (this.items.length === 1) return this.items.pop();

    const root = this.items[0];
    this.items[0] = this.items.pop();
    this.bubbleDown(0);
    return root;
  }

  toArray() {
    return [...this.items];
  }

  bubbleUp(index) {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (
        this.compare(this.items[currentIndex], this.items[parentIndex]) >= 0
      ) {
        break;
      }

      [this.items[currentIndex], this.items[parentIndex]] = [
        this.items[parentIndex],
        this.items[currentIndex],
      ];
      currentIndex = parentIndex;
    }
  }

  bubbleDown(index) {
    let currentIndex = index;

    while (true) {
      const leftChildIndex = currentIndex * 2 + 1;
      const rightChildIndex = currentIndex * 2 + 2;
      let smallestIndex = currentIndex;

      if (
        leftChildIndex < this.items.length &&
        this.compare(this.items[leftChildIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = leftChildIndex;
      }

      if (
        rightChildIndex < this.items.length &&
        this.compare(this.items[rightChildIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = rightChildIndex;
      }

      if (smallestIndex === currentIndex) break;

      [this.items[currentIndex], this.items[smallestIndex]] = [
        this.items[smallestIndex],
        this.items[currentIndex],
      ];
      currentIndex = smallestIndex;
    }
  }
}

export class PriorityNotificationManager {
  constructor({ topN = 10, logger } = {}) {
    this.topN = Math.max(1, Number(topN) || 10);
    this.logger = logger;
    this.seenNotificationIds = new Set();
    this.heap = new MinHeap(compareNotificationPriority);
    this.stats = {
      processed: 0,
      rejected: 0,
      duplicates: 0,
      read: 0,
      topNUpdates: 0,
    };
  }

  async processNotifications(rawNotifications = []) {
    for (const rawNotification of rawNotifications) {
      await this.processNotification(rawNotification);
    }

    return this.getTopNotifications();
  }

  async processNotification(rawNotification) {
    const normalized = normalizeNotification(rawNotification);

    if (normalized.error) {
      this.stats.rejected += 1;
      await this.logRejected(normalized.error, normalized.details);
      return { accepted: false, reason: normalized.error };
    }

    const notification = normalized.value;

    if (this.seenNotificationIds.has(notification.id)) {
      this.stats.duplicates += 1;
      this.stats.rejected += 1;
      await this.logRejected("duplicate_notification", {
        id: notification.id,
      });
      return { accepted: false, reason: "duplicate_notification" };
    }

    this.seenNotificationIds.add(notification.id);

    if (!notification.unread) {
      this.stats.read += 1;
      this.stats.rejected += 1;
      await this.logRejected("read_notification", {
        id: notification.id,
        type: notification.type,
      });
      return { accepted: false, reason: "read_notification" };
    }

    this.stats.processed += 1;
    await this.logger?.info("notification_processed", {
      id: notification.id,
      type: notification.type,
      timestamp: notification.timestamp,
    });

    const didUpdateTopN = await this.addToTopN(notification);
    return { accepted: true, didUpdateTopN };
  }

  async addToTopN(notification) {
    if (this.heap.size < this.topN) {
      this.heap.push(notification);
      await this.logTopNUpdated(notification, "inserted");
      return true;
    }

    const lowestRankedTopNotification = this.heap.peek();
    if (compareNotificationPriority(notification, lowestRankedTopNotification) > 0) {
      this.heap.replaceRoot(notification);
      await this.logTopNUpdated(notification, "replaced_lowest_priority");
      return true;
    }

    return false;
  }

  getTopNotificationSet() {
    return this.heap.toArray().map((notification) => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      timestamp: notification.timestamp,
      unread: notification.unread,
      raw: notification.raw,
    }));
  }

  getTopNotifications() {
    return this.heap
      .toArray()
      .sort((left, right) => compareNotificationPriority(right, left))
      .map((notification) => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        timestamp: notification.timestamp,
        unread: notification.unread,
        raw: notification.raw,
      }));
  }

  getStats() {
    return { ...this.stats, retained: this.heap.size };
  }

  async logRejected(reason, details = {}) {
    await this.logger?.warn("notification_rejected", {
      reason,
      ...details,
    });
  }

  async logTopNUpdated(notification, action) {
    this.stats.topNUpdates += 1;
    await this.logger?.info("top_n_updated", {
      action,
      id: notification.id,
      type: notification.type,
      retained: this.heap.size,
      topN: this.topN,
    });
  }
}
