"use client";

import { useState } from "react";
import EntryGrid from "../components/EntryGrid";
import MasterGrid from "../components/MasterGrid";
import RangeManager from "../components/RangeManager";
import ImportModal from "../components/ImportModal";
import ExportModal from "../components/ExportModal";
import { useStore } from "../lib/store";

const TABS = [
  { key: "firstEntry", label: "First Entry" },
  { key: "master", label: "Master Data" },
  { key: "range", label: "Range" },
];

export default function Page() {
  const [tab, setTab] = useState("firstEntry");
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const { loading, saving, connected, error, firstEntry, submitToMaster } = useStore();

  async function handleNewMonth() {
    const filled = firstEntry.filter((r) =>
      Object.keys(r).some((k) => k !== "_id" && String(r[k] ?? "").trim() !== "")
    ).length;
    const msg =
      filled > 0
        ? `${filled} row(s) currently in First Entry will be archived to Master Data, then First Entry will be cleared for the new month. Continue?`
        : "Clear First Entry for the new month? (Master Data is untouched.)";
    if (!window.confirm(msg)) return;
    const res = await submitToMaster();
    if (!res.ok) alert(`Couldn't complete the month-end reset: ${res.error}`);
  }

  if (loading) {
    return (
      <div className="shell">
        <div className="main" style={{ padding: 28 }}>
          <span className="panel-note">Loading from Google Sheets…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">LEDGER</span>
          <span className="brand-title">Sales Data Entry</span>
        </div>
        <span className="brand-sub">
          {saving ? (
            <span className="saving-dot">Saving to sheet</span>
          ) : connected ? (
            "Connected to Google Sheets"
          ) : (
            "Google Sheets not connected"
          )}
        </span>
      </div>

      <div className="main">
        {connected === false && (
          <div className="banner banner-warn">
            Can't reach the Google Sheet — working in a local-only session, changes won't be saved.{" "}
            {error ? <span className="mono">{error}</span> : "Check the GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEET_ID environment variables."}
          </div>
        )}

        {tab === "firstEntry" && (
          <>
            <div className="toolbar" style={{ marginBottom: 4 }}>
              <button className="btn" onClick={() => setShowImport(true)}>
                Import Excel / CSV
              </button>
              <button className="btn" onClick={() => setShowExport(true)}>
                Export First Entry
              </button>
              <div className="toolbar-spacer" />
              <button className="btn btn-amber" onClick={handleNewMonth}>
                Start new month (archive &amp; clear)
              </button>
            </div>
            <EntryGrid />
          </>
        )}

        {tab === "master" && <MasterGrid />}
        {tab === "range" && <RangeManager />}
      </div>

      <div className="sheet-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`sheet-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showExport && <ExportModal source="firstEntry" onClose={() => setShowExport(false)} />}
    </div>
  );
}
