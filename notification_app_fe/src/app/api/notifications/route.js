import { NextResponse } from "next/server";

const EXTERNAL_API_BASE = "http://4.224.186.213/evaluation-service";
const API_TOKEN = process.env.EVALUATION_TOKEN || process.env.EVALUATION_API_TOKEN || process.env.NEXT_PUBLIC_TOKEN;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const notificationType = searchParams.get("notification_type") || "";

    const queryParams = new URLSearchParams({
      page,
      limit,
    });

    if (notificationType) {
      queryParams.append("notification_type", notificationType);
    }

    const externalUrl = `${EXTERNAL_API_BASE}/notifications?${queryParams.toString()}`;

    const headers = {
      "Content-Type": "application/json",
    };

    if (API_TOKEN) {
      headers.Authorization = `Bearer ${API_TOKEN}`;
    }

    const externalResponse = await fetch(externalUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch notifications from external API",
          status: externalResponse.status,
        },
        { status: externalResponse.status }
      );
    }

    const data = await externalResponse.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
