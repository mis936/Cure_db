/**
 * Sales Ledger — Google Apps Script companion for the spreadsheet.
 *
 * Install: open the spreadsheet > Extensions > Apps Script > paste this file as Code.gs
 * (and the appsscript.json manifest if you want the Asia/Kolkata time zone) > Save,
 * then reload the spreadsheet. A "Sales Ledger" menu appears next to Help.
 *
 * What it does:
 *  1. Creates the three tabs and writes the fixed header rows (setupSheets).
 *  2. Adds dropdowns to First Entry that read from the Range tab (applyDropdowns).
 *  3. Fills Month and Year when someone types a Date directly in the sheet (onEdit).
 *  4. Moves every filled First Entry row into Master Data and clears First Entry,
 *     either on demand or automatically on the 1st of each month (monthEndArchive).
 *
 * The web app does not depend on this script. It reads and writes the same tabs
 * through the Sheets API. Run this only for the sheet-side conveniences above.
 */

var TAB_FIRST_ENTRY = 'First Entry';
var TAB_MASTER = 'Master Data';
var TAB_RANGE = 'Range';

// Fixed header order. Must match lib/schema.js in the app. Never reorder.
var DATA_HEADERS = [
  'Company', 'Sales Type', 'Location', 'Date', 'Month', 'Year',
  'Hospital Name', 'Sales Manager', 'Customer Name', 'Ar No', 'Item Name',
  'Item', 'Item Category', 'Item Group', 'Division', 'Surg Of Spm/Dex', 'Qty',
  'Surgery No.', 'Inv No', 'Inv Amt', 'Inv Amt W/O', 'Cn', 'Discount', 'Nr',
  'Slip No', 'Narration', 'Cost', 'Total Costing'
];

var RANGE_HEADERS = [
  'Company', 'Sales Type', 'Location', 'Hospital Name', 'Sales Manager',
  'Customer Name', 'Surg Of Spm/Dex', 'Item', 'Item Category', 'Item Group',
  'Division', 'Qty'
];

// First Entry column (1-based) -> Range column (1-based) that feeds its dropdown.
// strict = true rejects values not in the list; false (combo fields) also allows typing.
var DROPDOWNS = [
  { col: 1, range: 1, strict: true },   // Company
  { col: 2, range: 2, strict: true },   // Sales Type
  { col: 3, range: 3, strict: true },   // Location
  { col: 7, range: 4, strict: true },   // Hospital Name
  { col: 8, range: 5, strict: true },   // Sales Manager
  { col: 9, range: 6, strict: true },   // Customer Name
  { col: 16, range: 7, strict: true },  // Surg Of Spm/Dex
  { col: 12, range: 8, strict: false }, // Item (combo)
  { col: 13, range: 9, strict: false }, // Item Category (combo)
  { col: 14, range: 10, strict: false },// Item Group (combo)
  { col: 15, range: 11, strict: false },// Division (combo)
  { col: 17, range: 12, strict: false } // Qty (combo)
];

var DATE_COL = 4;
var MONTH_COL = 5;
var YEAR_COL = 6;
var VALIDATION_ROWS = 2000; // rows 2..2001 get dropdowns

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sales Ledger')
    .addItem('Set up tabs and headers', 'setupSheets')
    .addItem('Apply dropdowns to First Entry', 'applyDropdowns')
    .addSeparator()
    .addItem('Archive First Entry to Master Data now', 'monthEndArchive')
    .addItem('Turn on automatic month-end archive', 'installMonthEndTrigger')
    .addItem('Turn off automatic month-end archive', 'removeMonthEndTrigger')
    .addToUi();
}

/** Creates any missing tab and writes the header row. Existing data below row 1 is untouched. */
function setupSheets() {
  var ss = SpreadsheetApp.getActive();
  writeHeaders_(getOrCreateSheet_(ss, TAB_FIRST_ENTRY), DATA_HEADERS);
  writeHeaders_(getOrCreateSheet_(ss, TAB_MASTER), DATA_HEADERS);
  writeHeaders_(getOrCreateSheet_(ss, TAB_RANGE), RANGE_HEADERS);
  applyDropdowns();
  SpreadsheetApp.getActive().toast('Tabs and headers are ready.', 'Sales Ledger', 5);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function writeHeaders_(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold').setBackground('#1e2530').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

/** Dropdowns on First Entry read live from the Range tab, so new Range values appear at once. */
function applyDropdowns() {
  var ss = SpreadsheetApp.getActive();
  var entry = ss.getSheetByName(TAB_FIRST_ENTRY);
  var range = ss.getSheetByName(TAB_RANGE);
  if (!entry || !range) {
    SpreadsheetApp.getUi().alert('Run "Set up tabs and headers" first.');
    return;
  }
  DROPDOWNS.forEach(function (d) {
    var source = range.getRange(2, d.range, range.getMaxRows() - 1, 1);
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(source, true)
      .setAllowInvalid(!d.strict)
      .build();
    entry.getRange(2, d.col, VALIDATION_ROWS, 1).setDataValidation(rule);
  });
  var dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  entry.getRange(2, DATE_COL, VALIDATION_ROWS, 1).setDataValidation(dateRule).setNumberFormat('yyyy-mm-dd');
}

/**
 * Simple trigger: when a Date is typed into First Entry, fill Month and Year beside it.
 * Writes values, not formulas, so the web app's autosave never overwrites a formula.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== TAB_FIRST_ENTRY) return;
  if (e.range.getColumn() !== DATE_COL || e.range.getRow() < 2) return;
  var value = e.range.getValue();
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    sheet.getRange(e.range.getRow(), MONTH_COL, 1, 2).clearContent();
    return;
  }
  var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  sheet.getRange(e.range.getRow(), MONTH_COL, 1, 2).setValues([[
    Utilities.formatDate(value, tz, 'MMM'),
    Utilities.formatDate(value, tz, 'yyyy')
  ]]);
}

/**
 * Appends every filled First Entry row to Master Data, then clears First Entry.
 * Rows are cleared only after the append succeeds, so nothing is lost on an error.
 */
function monthEndArchive() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActive();
    var entry = ss.getSheetByName(TAB_FIRST_ENTRY);
    var master = ss.getSheetByName(TAB_MASTER);
    if (!entry || !master) throw new Error('First Entry or Master Data tab is missing.');

    var lastRow = entry.getLastRow();
    var width = DATA_HEADERS.length;
    if (lastRow < 2) return toast_('First Entry is already empty.');

    var rows = entry.getRange(2, 1, lastRow - 1, width).getValues().filter(function (row) {
      return row.some(function (cell) { return String(cell).trim() !== ''; });
    });

    if (rows.length) {
      var target = Math.max(master.getLastRow(), 1) + 1;
      master.getRange(target, 1, rows.length, width).setValues(rows);
    }
    entry.getRange(2, 1, lastRow - 1, width).clearContent();
    toast_(rows.length + ' row(s) moved to Master Data. First Entry is cleared.');
  } finally {
    lock.releaseLock();
  }
}

function toast_(message) {
  try { SpreadsheetApp.getActive().toast(message, 'Sales Ledger', 8); } catch (err) { /* no UI in a trigger run */ }
}

/** Runs monthEndArchive early on the 1st of every month (spreadsheet script time zone). */
function installMonthEndTrigger() {
  removeMonthEndTrigger();
  ScriptApp.newTrigger('monthEndArchive').timeBased().onMonthDay(1).atHour(1).create();
  toast_('Automatic archive is on: it runs on the 1st of each month around 1 AM.');
}

function removeMonthEndTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'monthEndArchive') ScriptApp.deleteTrigger(t);
  });
}
