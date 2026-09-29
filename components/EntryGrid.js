"use client";

import { useState } from "react";
import { FIELDS } from "../lib/schema";
import { useStore } from "../lib/store";

function CellEditor({ row, field, ranges, onChange }) {
  const value = row[field.key] ?? "";

  if (field.type === "auto") {
    return <div className="cell-auto">{value || "—"}</div>;
  }

  if (field.type === "date") {
    return (
      <input
        className="cell-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        className="cell-input mono"
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    );
  }

  if (field.type === "dropdown") {
    const options = ranges[field.range] || [];
    return (
      <select className="cell-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        {value && !options.includes(value) && <option value={value}>{value}</option>}
      </select>
    );
  }

  if (field.type === "combo") {
    const options = ranges[field.range] || [];
    const listId = `list-${field.key}`;
    return (
      <>
        <input
          className="cell-input"
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type or pick…"
        />
        <datalist id={listId}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </>
    );
  }

  return (
    <input
      className="cell-input"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function EntryGrid() {
  const {
    firstEntry,
    ranges,
    updateFirstEntryCell,
    deleteFirstEntryRow,
    addFirstEntryRows,
    submitToMaster,
    saveNow,
    saving,
  } = useStore();
  const [activeRowId, setActiveRowId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filledCount = firstEntry.filter((row) =>
    FIELDS.some((f) => String(row[f.key] ?? "").trim() !== "")
  ).length;

  async function handleSubmit() {
    setSubmitting(true);
    const res = await submitToMaster();
    setSubmitting(false);
    if (res.ok) {
      alert(`${res.submitted} row(s) moved to Master Data.`);
    } else {
      alert(`Couldn't submit: ${res.error}`);
    }
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn" onClick={addFirstEntryRows}>
          + Add 50 rows
        </button>
        <button className="btn" onClick={saveNow} disabled={saving}>
          {saving ? "Saving…" : "Save to sheet"}
        </button>
        <span className="row-count">
          {filledCount} of {firstEntry.length} row{firstEntry.length === 1 ? "" : "s"} filled
        </span>
        <div className="toolbar-spacer" />
        <button className="btn btn-primary" onClick={handleSubmit} disabled={filledCount === 0 || submitting}>
          {submitting ? "Submitting…" : "Submit to Master Data →"}
        </button>
      </div>

      <div className="grid-wrap">
        <table
          className="grid focusable"
          onFocus={(e) => {
            const tr = e.target.closest("tr");
            if (tr?.dataset?.rowId) setActiveRowId(tr.dataset.rowId);
          }}
        >
          <thead>
            <tr>
              {FIELDS.map((f) => (
                <th key={f.key} className={f.type === "auto" ? "auto-col" : ""}>
                  {f.label}
                </th>
              ))}
              <th className="row-actions-col">—</th>
            </tr>
          </thead>
          <tbody>
            {firstEntry.map((row) => (
              <tr key={row._id} data-row-id={row._id} className={row._id === activeRowId ? "active-row" : ""}>
                {FIELDS.map((f, i) => (
                  <td key={f.key} className={i === 0 ? "first-col" : ""}>
                    <CellEditor
                      row={row}
                      field={f}
                      ranges={ranges}
                      onChange={(val) => updateFirstEntryCell(row._id, f.key, val)}
                    />
                  </td>
                ))}
                <td className="row-actions-col">
                  <button className="row-del" title="Delete row" onClick={() => deleteFirstEntryRow(row._id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
