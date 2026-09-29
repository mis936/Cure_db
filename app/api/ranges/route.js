import { NextResponse } from "next/server";
import { RANGE_LIST_KEYS } from "../../../lib/schema";
import { readSheetRows, writeColumn, TAB_RANGE } from "../../../lib/sheetsClient";

export async function GET() {
  try {
    const raw = await readSheetRows(TAB_RANGE, RANGE_LIST_KEYS.length);
    const ranges = {};
    RANGE_LIST_KEYS.forEach((r, i) => {
      ranges[r.key] = raw.map((row) => row[i]).filter((v) => v && String(v).trim() !== "");
    });
    return NextResponse.json({ ranges });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 200 });
  }
}

// body: { rangeKey, values } — replaces one named list's whole column.
export async function PUT(request) {
  try {
    const { rangeKey, values } = await request.json();
    const colIndex = RANGE_LIST_KEYS.findIndex((r) => r.key === rangeKey);
    if (colIndex === -1) throw new Error("Unknown range key: " + rangeKey);
    await writeColumn(TAB_RANGE, colIndex, values || []);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
