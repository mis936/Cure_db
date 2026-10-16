import { NextResponse } from "next/server";
import { HEADERS, RANGE_LIST_KEYS } from "../../../lib/schema";
import {
  getSheetsClient,
  colLetter,
  TAB_FIRST_ENTRY,
  TAB_MASTER,
  TAB_RANGE,
} from "../../../lib/sheetsClient";

// Never cache: this must reflect the live environment and sheet on every call.
export const dynamic = "force-dynamic";

async function checkTab(sheets, sheetId, tab, expected) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A1:${colLetter(expected.length - 1)}1`,
    });
    const actual = (res.data.values?.[0] || []).map((v) => String(v).trim());
    const mismatches = [];
    expected.forEach((header, i) => {
      if ((actual[i] || "") !== header) {
        mismatches.push({ column: colLetter(i), expected: header, found: actual[i] || "" });
      }
    });
    return { tab, ok: mismatches.length === 0, mismatches };
  } catch (e) {
    return { tab, ok: false, error: e.message };
  }
}

// Open /api/health after deploying. It reports which env vars are present (never
// their values) and whether each tab exists with the exact fixed header row.
export async function GET() {
  const env = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    GOOGLE_PRIVATE_KEY: Boolean(process.env.GOOGLE_PRIVATE_KEY),
    GOOGLE_SHEET_ID: Boolean(process.env.GOOGLE_SHEET_ID),
  };

  if (!Object.values(env).every(Boolean)) {
    return NextResponse.json({
      ok: false,
      env,
      error: "One or more environment variables are missing in this deployment.",
    });
  }

  try {
    const { sheets, sheetId } = getSheetsClient();
    const tabs = await Promise.all([
      checkTab(sheets, sheetId, TAB_FIRST_ENTRY, HEADERS),
      checkTab(sheets, sheetId, TAB_MASTER, HEADERS),
      checkTab(sheets, sheetId, TAB_RANGE, RANGE_LIST_KEYS.map((r) => r.label)),
    ]);
    return NextResponse.json({ ok: tabs.every((t) => t.ok), env, tabs });
  } catch (e) {
    return NextResponse.json({ ok: false, env, error: e.message });
  }
}
