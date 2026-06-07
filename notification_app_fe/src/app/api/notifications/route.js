import { NextResponse } from "next/server";
import {
  API_BASE_URL,
  externalApiClient,
  normalizeNotificationResponse,
} from "@/services/api";
import { getAccessToken } from "@/services/auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const params = {
    page: searchParams.get("page") || "1",
    limit: searchParams.get("limit") || "100",
    notification_type: searchParams.get("notification_type") || "",
  };

  try {
    const accessToken = await getAccessToken();
    const response = await externalApiClient.get("/notifications", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params,
    });

    return NextResponse.json(
      {
        notifications: normalizeNotificationResponse(response.data),
        source: `${API_BASE_URL}/notifications`,
      },
      { status: 200 }
    );
  } catch (error) {
    const status = error?.response?.status || 502;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to fetch notifications.";

    return NextResponse.json({ message }, { status });
  }
}
