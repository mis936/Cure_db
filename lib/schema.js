// Single source of truth for columns, order and cell types.
// This exact order is the Google Sheet's fixed header row for both
// "First Entry" and "Master Data" — never reorder FIELDS without updating the sheet too.

export const RANGE_LIST_KEYS = [
  { key: "company", label: "Company" },
  { key: "salesType", label: "Sales Type" },
  { key: "location", label: "Location" },
  { key: "hospitalName", label: "Hospital Name" },
  { key: "salesManager", label: "Sales Manager" },
  { key: "customerName", label: "Customer Name" },
  { key: "surgOfSpmDex", label: "Surg Of Spm/Dex" },
  { key: "item", label: "Item" },
  { key: "itemCategory", label: "Item Category" },
  { key: "itemGroup", label: "Item Group" },
  { key: "division", label: "Division" },
  { key: "qty", label: "Qty" },
];

// type: "dropdown" | "combo" (dropdown + manual) | "date" | "auto" | "text" | "number"
export const FIELDS = [
  { key: "company", label: "Company", type: "dropdown", range: "company" },
  { key: "salesType", label: "Sales Type", type: "dropdown", range: "salesType" },
  { key: "location", label: "Location", type: "dropdown", range: "location" },
  { key: "date", label: "Date", type: "date" },
  { key: "month", label: "Month", type: "auto" },
  { key: "year", label: "Year", type: "auto" },
  { key: "hospitalName", label: "Hospital Name", type: "dropdown", range: "hospitalName" },
  { key: "salesManager", label: "Sales Manager", type: "dropdown", range: "salesManager" },
  { key: "customerName", label: "Customer Name", type: "dropdown", range: "customerName" },
  { key: "arNo", label: "Ar No", type: "text" },
  { key: "itemName", label: "Item Name", type: "text" },
  { key: "item", label: "Item", type: "combo", range: "item" },
  { key: "itemCategory", label: "Item Category", type: "combo", range: "itemCategory" },
  { key: "itemGroup", label: "Item Group", type: "combo", range: "itemGroup" },
  { key: "division", label: "Division", type: "combo", range: "division" },
  { key: "surgOfSpmDex", label: "Surg Of Spm/Dex", type: "dropdown", range: "surgOfSpmDex" },
  { key: "qty", label: "Qty", type: "combo", range: "qty" },
  { key: "surgeryNo", label: "Surgery No.", type: "text" },
  { key: "invNo", label: "Inv No", type: "text" },
  { key: "invAmt", label: "Inv Amt", type: "number" },
  { key: "invAmtWO", label: "Inv Amt W/O", type: "number" },
  { key: "cn", label: "Cn", type: "text" },
  { key: "discount", label: "Discount", type: "number" },
  { key: "nr", label: "Nr", type: "text" },
  { key: "slipNo", label: "Slip No", type: "text" },
  { key: "narration", label: "Narration", type: "text" },
  { key: "cost", label: "Cost", type: "number" },
  { key: "totalCosting", label: "Total Costing", type: "number" },
];

export const HEADERS = FIELDS.map((f) => f.label);
export const FIELD_KEYS = FIELDS.map((f) => f.key);
export const ROWS_PER_BATCH = 50;

// Safe in both server and older browser runtimes (crypto.randomUUID needs a
// secure context / newer Node); falls back to a simple unique-enough id.
export function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptyRow() {
  const row = { _id: uid() };
  FIELDS.forEach((f) => (row[f.key] = ""));
  return row;
}

export function emptyRows(count = ROWS_PER_BATCH) {
  return Array.from({ length: count }, () => emptyRow());
}

export function deriveMonthYear(dateStr) {
  if (!dateStr) return { month: "", year: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: "", year: "" };
  return {
    month: d.toLocaleString("en-US", { month: "short" }),
    year: String(d.getFullYear()),
  };
}

export function hasAnyValue(row) {
  return FIELD_KEYS.some((k) => String(row[k] ?? "").trim() !== "");
}

// --- Sheet <-> app row conversions (shared by API routes and, for previewing, the client) ---

export function sheetRowToEntry(arr, idx) {
  const obj = { _id: `row-${idx}` };
  FIELD_KEYS.forEach((k, i) => (obj[k] = arr[i] ?? ""));
  return obj;
}

export function entryToSheetRow(obj) {
  return FIELD_KEYS.map((k) => obj[k] ?? "");
}
