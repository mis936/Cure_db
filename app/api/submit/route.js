import { NextResponse } from "next/server";
import {
  FIELD_KEYS,
  FIELDS,
  RANGE_LIST_KEYS,
  sheetRowToEntry,
  entryToSheetRow,
  hasAnyValue,
} from "../../../lib/schema";
import {
  readSheetRows,
  writeSheetRows,
  appendSheetRows,
  appendToColumn,
  TAB_FIRST_ENTRY,
  TAB_MASTER,
  TAB_RANGE,
} from "../../../lib/sheetsClient";

// Reads whatever is currently in the First Entry sheet (the sheet is the source
// of truth — the client autosaves to it before calling this), archives every
// filled row into Master Data, grows any combo-field Range lists with new typed
// values, then clears First Entry back to empty. Used by both the "Submit to
// Master Data" button and "Start new month" — they're the same operation.
export async function POST() {
  try {
    const raw = await readSheetRows(TAB_FIRST_ENTRY, FIELD_KEYS.length);
    const entries = raw.map((r, i) => sheetRowToEntry(r, i)).filter(hasAnyValue);

    if (entries.length) {
      await appendSheetRows(TAB_MASTER, FIELD_KEYS.length, entries.map(entryToSheetRow));
      await growComboRanges(entries);
    }

    await writeSheetRows(TAB_FIRST_ENTRY, FIELD_KEYS.length, []);

    return NextResponse.json({ ok: true, submitted: entries.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function growComboRanges(entries) {
  const comboFields = FIELDS.filter((f) => f.type === "combo" && f.range);
  const raw = await readSheetRows(TAB_RANGE, RANGE_LIST_KEYS.length);

  for (const f of comboFields) {
    const colIndex = RANGE_LIST_KEYS.findIndex((r) => r.key === f.range);
    if (colIndex === -1) continue;
    const existing = new Set(raw.map((row) => row[colIndex]).filter(Boolean));
    const additions = [];
    entries.forEach((e) => {
      const v = String(e[f.key] || "").trim();
      if (v && !existing.has(v)) {
        existing.add(v);
        additions.push(v);
      }
    });
    if (additions.length) {
      await appendToColumn(TAB_RANGE, colIndex, additions);
    }
  }
}
