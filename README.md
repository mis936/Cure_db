# Sales Ledger — Data Entry (Google Sheets backend)

Excel-style data entry app: React (Next.js App Router), backed by a Google Sheet, ready to
deploy on Vercel.

## How it's wired

- **First Entry** — the editable grid. Every column type is implemented: plain dropdown,
  dropdown + manual (combo, via `<datalist>`), date picker, auto-computed Month/Year, and manual
  text/number fields. Edits autosave to the sheet ~1.2s after you stop typing; there's also an
  explicit **Save to sheet** button. Import and Export both go through a manual column-mapping
  screen.
- **Master Data** — read-only, append-only archive with the fixed header order from the brief.
  Loaded fresh from the sheet whenever you open the tab.
- **Range** — the dropdown source lists, editable as one-value-per-line text areas, saved
  straight to the sheet's "Range" tab.
- **Submit to Master Data** / **Start new month** — both call the same server action: it reads
  whatever's currently in the First Entry sheet, archives every filled row into Master Data,
  grows the combo-field Range lists with any newly typed values, and clears First Entry back to
  blank.

All spreadsheet access happens server-side, in Next.js API routes under `app/api/`, using a
Google service account — the browser never sees your credentials.

## 1. Set up the Google Sheet

Create a Google Sheet (or use an existing one) with exactly these three tabs. **Header order must
match exactly** — the app reads and writes by column position, not by header text.

**"First Entry"** — row 1, columns A–AB:

```
Company | Sales Type | Location | Date | Month | Year | Hospital Name | Sales Manager |
Customer Name | Ar No | Item Name | Item | Item Category | Item Group | Division |
Surg Of Spm/Dex | Qty | Surgery No. | Inv No | Inv Amt | Inv Amt W/O | Cn | Discount | Nr |
Slip No | Narration | Cost | Total Costing
```

**"Master Data"** — identical header row, same order, in row 1.

**"Range"** — row 1, columns A–L:

```
Company | Sales Type | Location | Hospital Name | Sales Manager | Customer Name |
Surg Of Spm/Dex | Item | Item Category | Item Group | Division | Qty
```

(The brief's original Range tab only listed the first five; this app adds the extra seven
columns because Customer Name, Surg Of Spm/Dex, and the four combo fields also need a source
list. Confirm this layout works for you, or tell me if you'd rather split them across separate
tabs.)

Leave every other row empty for now — the app appends and clears data below row 1 itself.

## 2. Create a Google service account

1. In [Google Cloud Console](https://console.cloud.google.com/), open or create a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create Credentials → Service Account**. Give it any name.
4. Open the new service account → **Keys → Add Key → Create new key → JSON**. This downloads a
   JSON file — keep it private.
5. Open your Google Sheet → **Share** → paste the service account's email (from the JSON file's
   `client_email` field, looks like `xxx@xxx.iam.gserviceaccount.com`) → give it **Editor**
   access.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` for local development and fill in:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the JSON key's `client_email`.
- `GOOGLE_PRIVATE_KEY` — the JSON key's `private_key`, quotes and `\n` sequences included.
- `GOOGLE_SHEET_ID` — the id from your sheet's URL: `.../spreadsheets/d/THIS_PART/edit`.

`.env.local` is git-ignored — never commit real credentials.

## 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. If the env vars aren't set yet, the app still loads — it shows a
banner saying Google Sheets isn't connected and works in a local-only session so you can preview
the UI regardless.

## 5. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Vercel: **Add New → Project** → import the repo. Framework preset auto-detects as Next.js.
3. Before or right after the first deploy, go to **Project → Settings → Environment Variables**
   and add the same three variables from step 3 (paste the private key exactly as in
   `.env.local`, including the `BEGIN/END PRIVATE KEY` lines and `\n` sequences).
4. Deploy (or redeploy, if you added the env vars after the first deploy — env var changes need a
   redeploy to take effect).

## Notes / things to confirm

- **Autosave, not row-locking.** Edits save on a short debounce or the explicit Save button. If
  two people have First Entry open in different tabs at once, the last save wins — there's no
  per-cell conflict resolution. Fine for a single data-entry workflow; flag it if multiple people
  need to edit simultaneously and we can add row-level locking or real-time sync.
- **"Total Costing"** is a manual field here, matching the brief exactly — say if you'd rather it
  auto-calculate as Cost × Qty.
- **Month-end reset** is a manual button (no server to run a cron job against without adding a
  Vercel Cron Job). Ask if you'd like that automated — it's a small addition once this is live.
