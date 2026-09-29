"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { RANGE_LIST_KEYS, emptyRows, deriveMonthYear, hasAnyValue } from "./schema";

const StoreContext = createContext(null);

function emptyRangeMap() {
  const r = {};
  RANGE_LIST_KEYS.forEach((x) => (r[x.key] = []));
  return r;
}

export function StoreProvider({ children }) {
  const [firstEntry, setFirstEntry] = useState(() => emptyRows());
  const [master, setMaster] = useState([]);
  const [ranges, setRanges] = useState(emptyRangeMap);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(null); // null = checking, true/false once known
  const [error, setError] = useState(null);

  const saveTimer = useRef(null);
  const firstEntryRef = useRef(firstEntry);
  firstEntryRef.current = firstEntry;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [feRes, rangesRes] = await Promise.all([
        fetch("/api/first-entry").then((r) => r.json()),
        fetch("/api/ranges").then((r) => r.json()),
      ]);
      if (feRes.error) {
        setConnected(false);
        setError(feRes.error);
        setFirstEntry((prev) => (prev.length ? prev : emptyRows()));
      } else {
        setConnected(true);
        setError(null);
        setFirstEntry(feRes.rows?.length ? feRes.rows : emptyRows());
      }
      if (!rangesRes.error) {
        setRanges({ ...emptyRangeMap(), ...(rangesRes.ranges || {}) });
      }
    } catch (e) {
      setConnected(false);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMaster = useCallback(async () => {
    try {
      const res = await fetch("/api/master-data").then((r) => r.json());
      if (!res.error) setMaster(res.rows || []);
      else setError(res.error);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const persistFirstEntry = useCallback(
    async (rows) => {
      if (connected === false) return;
      setSaving(true);
      try {
        const res = await fetch("/api/first-entry", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        }).then((r) => r.json());
        if (res.error) {
          setError(res.error);
          setConnected(false);
        } else {
          setError(null);
          setConnected(true);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setSaving(false);
      }
    },
    [connected]
  );

  const scheduleSave = useCallback(
    (rows) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistFirstEntry(rows), 1200);
    },
    [persistFirstEntry]
  );

  const saveNow = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persistFirstEntry(firstEntryRef.current);
  }, [persistFirstEntry]);

  const updateFirstEntryCell = useCallback(
    (rowId, key, value) => {
      setFirstEntry((prev) => {
        const next = prev.map((row) => {
          if (row._id !== rowId) return row;
          const updated = { ...row, [key]: value };
          if (key === "date") {
            const { month, year } = deriveMonthYear(value);
            updated.month = month;
            updated.year = year;
          }
          return updated;
        });
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const addFirstEntryRows = useCallback(() => {
    setFirstEntry((prev) => {
      const next = [...prev, ...emptyRows()];
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const deleteFirstEntryRow = useCallback(
    (rowId) => {
      setFirstEntry((prev) => {
        const remaining = prev.filter((r) => r._id !== rowId);
        const next = remaining.length ? remaining : emptyRows();
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  // Import: rows already mapped to schema keys, merged with existing filled rows,
  // then saved immediately (no debounce — this is a deliberate, infrequent action).
  const importRows = useCallback(
    async (rows) => {
      let next;
      setFirstEntry((prev) => {
        next = [...prev.filter(hasAnyValue), ...rows];
        return next;
      });
      await persistFirstEntry(next);
    },
    [persistFirstEntry]
  );

  const updateRangeList = useCallback(async (rangeKey, values) => {
    setRanges((prev) => ({ ...prev, [rangeKey]: values }));
    try {
      const res = await fetch("/api/ranges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rangeKey, values }),
      }).then((r) => r.json());
      if (res.error) setError(res.error);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Flushes any pending edits, then asks the server to archive every filled row
  // in First Entry into Master Data and reset First Entry to blank. Same server
  // action backs both "Submit to Master Data" and "Start new month".
  const submitToMaster = useCallback(async () => {
    await saveNow();
    setSaving(true);
    try {
      const res = await fetch("/api/submit", { method: "POST" }).then((r) => r.json());
      if (res.error) {
        setError(res.error);
        return { ok: false, error: res.error };
      }
      await loadInitial();
      await loadMaster();
      return { ok: true, submitted: res.submitted };
    } catch (e) {
      setError(e.message);
      return { ok: false, error: e.message };
    } finally {
      setSaving(false);
    }
  }, [saveNow, loadInitial, loadMaster]);

  const value = useMemo(
    () => ({
      firstEntry,
      master,
      ranges,
      loading,
      saving,
      connected,
      error,
      loadMaster,
      updateFirstEntryCell,
      addFirstEntryRows,
      deleteFirstEntryRow,
      importRows,
      updateRangeList,
      submitToMaster,
      startNewMonth: submitToMaster,
      saveNow,
    }),
    [
      firstEntry,
      master,
      ranges,
      loading,
      saving,
      connected,
      error,
      loadMaster,
      updateFirstEntryCell,
      addFirstEntryRows,
      deleteFirstEntryRow,
      importRows,
      updateRangeList,
      submitToMaster,
      saveNow,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
