import { NextResponse } from "next/server";

const EXTERNAL_API_BASE = "http://4.224.186.213/evaluation-service";
const API_TOKEN = process.env.NEXT_PUBLIC_TOKEN;

export async function POST(request) {
  try {
    const body = await request.json();

    const payload = {
      stack: body.stack || "frontend",
      level: body.level || "info",
      package: body.package || "notification_app_fe",
      event: body.event || body.message || "unknown_event",
      timestamp: body.timestamp || new Date().toISOString(),
      message: body.message || body.event || "Log entry",
      context: body.context || {},
      details: body.details || {},
    };

    const externalUrl = `${EXTERNAL_API_BASE}/logs`;

    const headers = {
      "Content-Type": "application/json",
    };

    if (API_TOKEN) {
      headers.Authorization = `Bearer ${API_TOKEN}`;
    }

    const externalResponse = await fetch(externalUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to post logs to external API",
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
    console.error("Error posting logs:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
