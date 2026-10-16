// Server-only Google Sheets helper. Imported only by app/api/* route handlers,
// which always run on the server, so it's safe to read service-account secrets here.
import { google } from "googleapis";

export const TAB_FIRST_ENTRY = "First Entry";
export const TAB_MASTER = "Master Data";
export const TAB_RANGE = "Range";

let cachedAuth = null;

export function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !rawKey || !sheetId) {
    throw new Error(
      "Google Sheets isn't configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEET_ID as environment variables (see .env.example)."
    );
  }

  if (!cachedAuth) {
    // Tolerate the common paste mistakes: wrapping quotes, and \n typed as two
    // characters (as in the JSON key) instead of a real line break.
    const key = rawKey.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
    cachedAuth = new google.auth.JWT(email, undefined, key, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
  }

  return { sheets: google.sheets({ version: "v4", auth: cachedAuth }), sheetId };
}

// 0-based column index -> "A", "B", ..., "AA", "AB", ...
export function colLetter(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function readSheetRows(tabName, numCols) {
  const { sheets, sheetId } = getSheetsClient();
  const lastCol = colLetter(numCols - 1);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A2:${lastCol}100000`,
  });
  return res.data.values || [];
}

// Full replace of the data body (row 2 downward) — used for First Entry, whose
// rows always form one clean rectangular block, so clear+write is safe.
export async function writeSheetRows(tabName, numCols, rows) {
  const { sheets, sheetId } = getSheetsClient();
  const lastCol = colLetter(numCols - 1);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A2:${lastCol}100000`,
  });
  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A2`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
}

// Append full-width rows after the last row of a rectangular table (Master Data
// is always the same width every row, so the Sheets API's own table detection is safe here).
export async function appendSheetRows(tabName, numCols, rows) {
  if (!rows.length) return;
  const { sheets, sheetId } = getSheetsClient();
  const lastCol = colLetter(numCols - 1);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A2:${lastCol}2`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

// Appends to a single column without touching any other column. The "Range" tab
// has independent, ragged-length lists side by side, so values.append()'s whole-row
// table detection would misalign the other columns — this computes the next empty
// row in just that column and writes there instead.
export async function appendToColumn(tabName, colIndex, newValues) {
  if (!newValues.length) return;
  const { sheets, sheetId } = getSheetsClient();
  const col = colLetter(colIndex);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!${col}2:${col}100000`,
  });
  const existingRows = res.data.values || [];
  const nextRow = 2 + existingRows.length;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tabName}'!${col}${nextRow}`,
    valueInputOption: "RAW",
    requestBody: { values: newValues.map((v) => [v]) },
  });
}

export async function clearColumn(tabName, colIndex) {
  const { sheets, sheetId } = getSheetsClient();
  const col = colLetter(colIndex);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `'${tabName}'!${col}2:${col}100000`,
  });
}

// Full replace of one column's list (Range tab) — clear then write, never touches
// neighboring columns since both operations are scoped to that single column letter.
export async function writeColumn(tabName, colIndex, values) {
  await clearColumn(tabName, colIndex);
  if (values.length) {
    const { sheets, sheetId } = getSheetsClient();
    const col = colLetter(colIndex);
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tabName}'!${col}2`,
      valueInputOption: "RAW",
      requestBody: { values: values.map((v) => [v]) },
    });
  }
}
