"use client";

import { useEffect, useState } from "react";
import { FIELDS } from "../lib/schema";
import { useStore } from "../lib/store";
import ExportModal from "./ExportModal";

export default function MasterGrid() {
  const { master, loadMaster } = useStore();
  const [showExport, setShowExport] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    setRefreshing(true);
    loadMaster().finally(() => setRefreshing(false));
  }, [loadMaster]);

  return (
    <>
      <div className="toolbar">
        <span className="row-count">
          {refreshing ? "Loading…" : `${master.length} archived row${master.length === 1 ? "" : "s"}`}
        </span>
        <button
          className="btn"
          onClick={() => {
            setRefreshing(true);
            loadMaster().finally(() => setRefreshing(false));
          }}
        >
          Refresh
        </button>
        <div className="toolbar-spacer" />
        <button className="btn" onClick={() => setShowExport(true)} disabled={master.length === 0}>
          Export .xlsx
        </button>
      </div>

      <div className="grid-wrap">
        <table className="grid">
          <thead>
            <tr>
              {FIELDS.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {master.length === 0 && (
              <tr>
                <td colSpan={FIELDS.length} style={{ padding: 16, color: "var(--ink-soft)" }}>
                  {refreshing ? "Loading from the sheet…" : "Nothing archived yet. Submitted rows from First Entry land here."}
                </td>
              </tr>
            )}
            {master
              .slice()
              .reverse()
              .map((row) => (
                <tr key={row._id}>
                  {FIELDS.map((f, i) => (
                    <td key={f.key} className={i === 0 ? "first-col" : ""}>
                      <div className={`cell-auto ${f.type === "number" ? "mono" : ""}`}>{row[f.key] || "—"}</div>
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showExport && <ExportModal source="master" onClose={() => setShowExport(false)} />}
    </>
  );
}
