"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { FIELDS } from "../lib/schema";
import { useStore } from "../lib/store";

export default function ExportModal({ source, onClose }) {
  const { firstEntry, master } = useStore();
  const rows = source === "master" ? master : firstEntry;

  const [headerMap, setHeaderMap] = useState(() => {
    const m = {};
    FIELDS.forEach((f) => (m[f.key] = f.label));
    return m;
  });
  const [included, setIncluded] = useState(() => {
    const m = {};
    FIELDS.forEach((f) => (m[f.key] = true));
    return m;
  });

  function download() {
    const activeFields = FIELDS.filter((f) => included[f.key]);
    const header = activeFields.map((f) => headerMap[f.key] || f.label);
    const body = rows.map((r) => activeFields.map((f) => r[f.key] ?? ""));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, source === "master" ? "Master Data" : "First Entry");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${source === "master" ? "master-data" : "first-entry"}-${stamp}.xlsx`);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export {source === "master" ? "Master Data" : "First Entry"} — column mapping</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <p className="panel-note">
            {rows.length} row{rows.length === 1 ? "" : "s"} will be exported. Uncheck a field to
            leave it out of the file, or rename the output column header before downloading.
          </p>

          <div>
            {FIELDS.map((f) => (
              <div className="mapping-row" key={f.key} style={{ gridTemplateColumns: "24px 1fr 20px 1fr" }}>
                <input
                  type="checkbox"
                  checked={included[f.key]}
                  onChange={(e) => setIncluded((m) => ({ ...m, [f.key]: e.target.checked }))}
                />
                <div className="mono">{f.label}</div>
                <div className="mapping-arrow">→</div>
                <input
                  type="text"
                  value={headerMap[f.key]}
                  disabled={!included[f.key]}
                  onChange={(e) => setHeaderMap((m) => ({ ...m, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={download} disabled={rows.length === 0}>
            Download .xlsx
          </button>
        </div>
      </div>
    </div>
  );
}
