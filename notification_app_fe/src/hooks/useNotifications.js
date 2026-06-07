"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNotificationType } from "@/app/utils/notification-types";
import { NotificationService } from "@/services/NotificationService";
import { PriorityNotificationManager } from "@/services/PriorityNotificationManager";
import { logger, toErrorMessage } from "@/services/logger";

function buildSummary(notifications) {
  return notifications.reduce(
    (summary, notification) => {
      const type = getNotificationType(notification);
      return {
        ...summary,
        total: summary.total + 1,
        [type]: (summary[type] || 0) + 1,
      };
    },
    { total: 0, Event: 0, Result: 0, Placement: 0 }
  );
}

export function useNotifications({
  page = 1,
  limit = 100,
  topN = 10,
  notificationType = "",
} = {}) {
  const serviceRef = useRef(new NotificationService({ logger }));
  const managerRef = useRef();
  const managerKeyRef = useRef("");
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  const managerKey = `${notificationType}:${topN}`;

  const refetch = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  useEffect(() => {
    if (!managerRef.current || managerKeyRef.current !== managerKey) {
      managerRef.current = new PriorityNotificationManager({ topN, logger });
      managerKeyRef.current = managerKey;
    }
  }, [managerKey, topN]);

  useEffect(() => {
    let isActive = true;

    async function loadNotifications() {
      setIsLoading(true);
      setError("");

      try {
        const result = await serviceRef.current.getTopUnreadNotifications({
          page,
          limit,
          topN,
          notificationType,
          manager: managerRef.current,
        });

        if (!isActive) return;
        setNotifications(result.notifications);
        setStats(result.stats);
      } catch (loadError) {
        if (!isActive) return;

        setNotifications([]);
        setStats({});
        setError(toErrorMessage(loadError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isActive = false;
    };
  }, [limit, notificationType, page, reloadKey, topN]);

  const summary = useMemo(() => buildSummary(notifications), [notifications]);

  return {
    error,
    isLoading,
    notifications,
    refetch,
    stats,
    summary,
  };
}
