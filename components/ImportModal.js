"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FIELDS } from "../lib/schema";
import { useStore } from "../lib/store";

function guessField(header) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(header);
  const hit = FIELDS.find((f) => norm(f.label) === target);
  return hit ? hit.key : "";
}

export default function ImportModal({ onClose }) {
  const { importRows } = useStore();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [sourceHeaders, setSourceHeaders] = useState([]);
  const [sourceRows, setSourceRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState("upload"); // upload | map | importing | done
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const headersMatchExactly = useMemo(() => {
    if (sourceHeaders.length !== FIELDS.length) return false;
    return FIELDS.every((f, i) => sourceHeaders[i]?.trim().toLowerCase() === f.label.toLowerCase());
  }, [sourceHeaders]);

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
      if (!rows.length) return;
      const [headerRow, ...body] = rows;
      const headers = headerRow.map((h) => String(h ?? "").trim());
      setSourceHeaders(headers);
      setSourceRows(body.filter((r) => r.some((c) => String(c ?? "").trim() !== "")));

      const initialMap = {};
      headers.forEach((h) => (initialMap[h] = guessField(h)));
      setMapping(initialMap);
      setStep("map");
    };
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      handleFile(file);
    }
  }

  function onPick(e) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      handleFile(file);
    }
  }

  async function confirmImport() {
    setStep("importing");
    const mappedKeys = sourceHeaders.map((h) => mapping[h] || "");
    const rows = sourceRows.map((r) => {
      const obj = {};
      FIELDS.forEach((f) => (obj[f.key] = ""));
      mappedKeys.forEach((key, i) => {
        if (key) obj[key] = String(r[i] ?? "").trim();
      });
      if (obj.date && (!obj.month || !obj.year)) {
        const d = new Date(obj.date);
        if (!isNaN(d.getTime())) {
          obj.month = obj.month || d.toLocaleString("en-US", { month: "short" });
          obj.year = obj.year || String(d.getFullYear());
        }
      }
      return obj;
    });
    try {
      await importRows(rows);
      setImportedCount(rows.length);
      setStep("done");
    } catch (e) {
      setErrorMsg(e.message);
      setStep("map");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import Excel / CSV into First Entry</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          {step === "upload" && (
            <>
              <p className="panel-note">
                Upload a .xlsx or .csv file. Its header row will be checked against the First Entry
                headers — if they don't line up exactly, you'll get a screen to map each uploaded
                column to the right field manually before anything is imported and saved to the
                Google Sheet.
              </p>
              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                Drop a file here, or click to browse
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={onPick}
                />
              </div>
            </>
          )}

          {step === "map" && (
            <>
              <p className="panel-note mono" style={{ marginBottom: 6 }}>
                {fileName} — {sourceRows.length} data row{sourceRows.length === 1 ? "" : "s"}
              </p>

              {errorMsg && <div className="status-line status-warn">{errorMsg}</div>}

              {headersMatchExactly ? (
                <div className="status-line status-ok">
                  Header check passed — column order matches First Entry exactly.
                </div>
              ) : (
                <div className="status-line status-warn">
                  Headers don't match First Entry exactly. Map each uploaded column below, or
                  choose "Ignore column" to skip it.
                </div>
              )}

              <div>
                {sourceHeaders.map((h) => (
                  <div className="mapping-row" key={h || Math.random()}>
                    <div className="mono">{h || <em>(blank header)</em>}</div>
                    <div className="mapping-arrow">→</div>
                    <select
                      value={mapping[h] || ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                    >
                      <option value="">Ignore column</option>
                      {FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="preview-table-wrap">
                <table className="preview">
                  <thead>
                    <tr>
                      {sourceHeaders.map((h, i) => (
                        <th key={i}>{mapping[h] ? FIELDS.find((f) => f.key === mapping[h])?.label : h || "—"}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sourceRows.slice(0, 8).map((r, ri) => (
                      <tr key={ri}>
                        {sourceHeaders.map((_, ci) => (
                          <td key={ci}>{String(r[ci] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === "importing" && <div className="status-line status-ok">Saving rows to the Google Sheet…</div>}

          {step === "done" && (
            <div className="status-line status-ok">
              Imported {importedCount} row{importedCount === 1 ? "" : "s"} into First Entry and saved to
              the sheet. Submit to Master Data when ready.
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === "map" && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep("upload")}>
                Back
              </button>
              <button className="btn btn-primary" onClick={confirmImport} disabled={sourceRows.length === 0}>
                Import {sourceRows.length} row{sourceRows.length === 1 ? "" : "s"}
              </button>
            </>
          )}
          {step === "done" && (
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
          {step === "upload" && (
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
