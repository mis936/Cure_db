import { NextResponse } from "next/server";
import { FIELD_KEYS, sheetRowToEntry, entryToSheetRow } from "../../../lib/schema";
import { readSheetRows, appendSheetRows, TAB_MASTER } from "../../../lib/sheetsClient";

// Always run per request. Next 14 would otherwise try to cache GET handlers at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await readSheetRows(TAB_MASTER, FIELD_KEYS.length);
    const rows = raw.map((r, i) => sheetRowToEntry(r, i));
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 200 });
  }
}

// Direct append is exposed for completeness (e.g. scripted bulk loads), but the
// normal app flow archives First Entry via POST /api/submit instead.
export async function POST(request) {
  try {
    const body = await request.json();
    const rows = (body.rows || []).map(entryToSheetRow);
    await appendSheetRows(TAB_MASTER, FIELD_KEYS.length, rows);
    return NextResponse.json({ ok: true, appended: rows.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
