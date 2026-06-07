import { NextResponse } from "next/server";
import { externalApiClient } from "@/services/api";
import { getAccessToken } from "@/services/auth";

export async function POST(request) {
  try {
    const payload = await request.json();
    const accessToken = await getAccessToken();
    const response = await externalApiClient.post("/logs", payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    const status = error?.response?.status || 202;

    return NextResponse.json(
      {
        message: "Log delivery failed but was accepted locally.",
      },
      { status }
    );
  }
}
