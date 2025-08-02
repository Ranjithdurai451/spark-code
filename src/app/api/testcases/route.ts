import { NextRequest, NextResponse } from "next/server";
import { generateTestCases } from "../../../lib/testcases";

export async function POST(req: NextRequest) {
  const { code, language } = await req.json();
  try {
    const result = await generateTestCases({ code, language });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}