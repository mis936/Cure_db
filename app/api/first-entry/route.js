import { NextResponse } from "next/server";
import { FIELD_KEYS, sheetRowToEntry, entryToSheetRow, emptyRows } from "../../../lib/schema";
import { readSheetRows, writeSheetRows, TAB_FIRST_ENTRY } from "../../../lib/sheetsClient";

// Always run per request. Next 14 would otherwise try to cache GET handlers at build time.
export const dynamic = "force-dynamic";

// GET: current First Entry sheet contents (falls back to a fresh batch of blank
// rows if the sheet's data body is empty).
export async function GET() {
  try {
    const raw = await readSheetRows(TAB_FIRST_ENTRY, FIELD_KEYS.length);
    const rows = raw.map((r, i) => sheetRowToEntry(r, i));
    return NextResponse.json({ rows: rows.length ? rows : emptyRows() });
  } catch (e) {
    // Not fatal to the app — the client falls back to a local-only session and
    // shows a banner explaining Google Sheets isn't configured yet.
    return NextResponse.json({ error: e.message }, { status: 200 });
  }
}

// PUT: full replace of the First Entry data body — used for autosave, imports,
// and row add/delete.
export async function PUT(request) {
  try {
    const body = await request.json();
    const rows = (body.rows || []).map(entryToSheetRow);
    await writeSheetRows(TAB_FIRST_ENTRY, FIELD_KEYS.length, rows);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
