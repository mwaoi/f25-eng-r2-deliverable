import { NextResponse } from "next/server";
import { generateResponse } from "@/lib/services/species-chat";

type ReqBody = { message?: string };

export async function POST(req: Request) {
  try {
    let body: ReqBody | undefined;
    try {
      body = (await req.json()) as ReqBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const message = (body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const response = await generateResponse(message);
    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({ error: "Upstream provider error." }, { status: 502 });
  }
}
