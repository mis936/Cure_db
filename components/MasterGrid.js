"use client";

import { useEffect, useMemo, useState } from "react";
import { FIELDS } from "../lib/schema";
import { useStore } from "../lib/store";
import ExportModal from "./ExportModal";

// Fields the filter bar offers as dropdowns — the ones people actually narrow by.
// Options are built from whatever values exist in Master Data itself, not the
// Range lists, so filters always match what's really in the archive.
const FILTER_FIELDS = [
  { key: "company", label: "Company" },
  { key: "salesType", label: "Sales Type" },
  { key: "location", label: "Location" },
  { key: "hospitalName", label: "Hospital Name" },
  { key: "salesManager", label: "Sales Manager" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const EMPTY_FILTERS = FILTER_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});

export default function MasterGrid() {
  const { master, loadMaster } = useStore();
  const [showExport, setShowExport] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRefreshing(true);
    loadMaster().finally(() => setRefreshing(false));
  }, [loadMaster]);

  const filterOptions = useMemo(() => {
    const opts = {};
    FILTER_FIELDS.forEach((f) => {
      opts[f.key] = Array.from(new Set(master.map((r) => r[f.key]).filter(Boolean))).sort();
    });
    return opts;
  }, [master]);

  const filteredMaster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return master.filter((row) => {
      for (const f of FILTER_FIELDS) {
        if (filters[f.key] && row[f.key] !== filters[f.key]) return false;
      }
      if (q) {
        const hit = FIELDS.some((f) => String(row[f.key] ?? "").toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [master, filters, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search.trim() ? 1 : 0);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearch("");
  }

  return (
    <>
      <div className="toolbar">
        <span className="row-count">
          {refreshing
            ? "Loading…"
            : activeFilterCount
            ? `${filteredMaster.length} of ${master.length} row${master.length === 1 ? "" : "s"} (filtered)`
            : `${master.length} archived row${master.length === 1 ? "" : "s"}`}
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
        <button className="btn" onClick={() => setShowExport(true)} disabled={filteredMaster.length === 0}>
          Export .xlsx{activeFilterCount ? " (filtered)" : ""}
        </button>
      </div>

      <div className="filter-bar">
        {FILTER_FIELDS.map((f) => (
          <select
            key={f.key}
            className="filter-select"
            value={filters[f.key]}
            onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
          >
            <option value="">{f.label}: All</option>
            {filterOptions[f.key]?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ))}
        <input
          className="filter-search"
          type="text"
          placeholder="Search any field…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {activeFilterCount > 0 && (
          <button className="btn btn-ghost" onClick={clearFilters}>
            Clear filters
          </button>
        )}
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
            {filteredMaster.length === 0 && (
              <tr>
                <td colSpan={FIELDS.length} style={{ padding: 16, color: "var(--ink-soft)" }}>
                  {refreshing
                    ? "Loading from the sheet…"
                    : master.length === 0
                    ? "Nothing archived yet. Submitted rows from First Entry land here."
                    : "No rows match the current filters."}
                </td>
              </tr>
            )}
            {filteredMaster
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

      {showExport && (
        <ExportModal source="master" rows={filteredMaster} onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
