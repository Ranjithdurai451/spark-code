import { NextRequest, NextResponse } from "next/server";
import { executeCode } from "../../../lib/code-execution";

export async function POST(req: NextRequest) {
  const { code, language, input } = await req.json();
  try {
    const result = await executeCode({ code, language, input });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}