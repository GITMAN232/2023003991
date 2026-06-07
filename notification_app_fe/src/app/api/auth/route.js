import { NextResponse } from "next/server";
import { getAccessToken } from "@/services/auth";

export async function GET() {
  try {
    await getAccessToken();
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        message: error?.message || "Authentication failed.",
      },
      { status: 500 }
    );
  }
}
