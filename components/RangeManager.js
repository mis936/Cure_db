"use client";

import { RANGE_LIST_KEYS } from "../lib/schema";
import { useStore } from "../lib/store";

export default function RangeManager() {
  const { ranges, updateRangeList } = useStore();

  return (
    <>
      <p className="section-title">Range</p>
      <p className="panel-note">
        One value per line — saved straight to the "Range" tab of the Google Sheet. These lists
        feed the dropdowns on First Entry. Company, Sales Type, Location, Hospital Name and Sales
        Manager are the five columns from the original brief; the rest back Customer Name, Surg
        Of Spm/Dex and the combo fields (Item, Item Category, Item Group, Division, Qty), which
        also need a source list.
      </p>

      <div className="range-grid">
        {RANGE_LIST_KEYS.map((r) => (
          <div className="range-card" key={r.key}>
            <h4>{r.label}</h4>
            <textarea
              className="mono"
              value={(ranges[r.key] || []).join("\n")}
              onChange={(e) =>
                updateRangeList(
                  r.key,
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder={`One ${r.label.toLowerCase()} per line`}
            />
            <div className="hint">{(ranges[r.key] || []).length} value(s)</div>
          </div>
        ))}
      </div>
    </>
  );
}
