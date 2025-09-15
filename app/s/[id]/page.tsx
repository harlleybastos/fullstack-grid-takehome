"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Sheet, CellAddress, toCellAddress } from "@/types";
import Grid from "@/components/Grid";
import FormulaBar from "@/components/FormulaBar";

export default function SheetPage() {
  const params = useParams();
  const sheetId = params.id as string;

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<CellAddress | null>(null);
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
  const [editValue, setEditValue] = useState("");
  const [formulaBarValue, setFormulaBarValue] = useState("");

  useEffect(() => {
    fetchSheet();
  }, [sheetId]);

  const fetchSheet = async () => {
    try {
      const response = await fetch(`/api/sheets/${sheetId}`);
      if (response.ok) {
        const data = await response.json();
        setSheet(data);
        // Select A1 by default
        setSelectedCell(toCellAddress("A1"));
      }
    } catch (error) {
      console.error("Failed to fetch sheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellSelect = useCallback(
    (address: CellAddress) => {
      if (editingCell) {
        handleEndEdit();
      }
      setSelectedCell(address);

      if (sheet) {
        const cell = sheet.cells[address];
        if (cell) {
          if (cell.kind === "formula") {
            setFormulaBarValue(cell.src);
          } else if (cell.kind === "literal") {
            setFormulaBarValue(String(cell.value));
          } else {
            setFormulaBarValue("");
          }
        } else {
          setFormulaBarValue("");
        }
      }
    },
    [sheet, editingCell]
  );

  const handleStartEdit = useCallback(
    (address: CellAddress) => {
      setEditingCell(address);

      if (sheet) {
        const cell = sheet.cells[address];
        if (cell) {
          if (cell.kind === "formula") {
            setEditValue(cell.src);
            setFormulaBarValue(cell.src);
          } else if (cell.kind === "literal") {
            const value = String(cell.value);
            setEditValue(value);
            setFormulaBarValue(value);
          }
        } else {
          setEditValue("");
          setFormulaBarValue("");
        }
      }
    },
    [sheet]
  );

  const handleEndEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleCellUpdate = async (address: CellAddress, value: string) => {
    if (!sheet) return;

    // Determine if it's a formula or literal
    let edit: any = {
      addr: address,
      kind: "literal",
      value: value,
    };

    if (value === "") {
      edit = { addr: address, kind: "clear" };
    } else if (value.startsWith("=")) {
      edit = {
        addr: address,
        kind: "formula",
        formula: value,
      };
    } else {
      // Try to parse as number
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && value.trim() === String(numValue)) {
        edit.value = numValue;
      } else if (
        value.toLowerCase() === "true" ||
        value.toLowerCase() === "false"
      ) {
        edit.value = value.toLowerCase() === "true";
      } else {
        edit.value = value;
      }
    }

    try {
      const response = await fetch(`/api/sheets/${sheetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edits: [edit] }),
      });

      if (response.ok) {
        const updatedSheet = await response.json();
        setSheet(updatedSheet);
        setFormulaBarValue(value);
      }
    } catch (error) {
      console.error("Failed to update cell:", error);
    }
  };

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
    setFormulaBarValue(value);
  }, []);

  const handleFormulaBarChange = useCallback(
    (value: string) => {
      setFormulaBarValue(value);
      if (editingCell) {
        setEditValue(value);
      }
    },
    [editingCell]
  );

  const handleFormulaBarSubmit = useCallback(() => {
    if (selectedCell) {
      handleCellUpdate(selectedCell, formulaBarValue);
      handleEndEdit();
    }
  }, [selectedCell, formulaBarValue]);

  const handleFormulaBarStartEdit = useCallback(() => {
    if (selectedCell && !editingCell) {
      handleStartEdit(selectedCell);
    }
  }, [selectedCell, editingCell]);

  const exportCSV = () => {
    if (!sheet) return;

    // Simple CSV export
    const rows = [];
    for (let r = 0; r < Math.min(sheet.rows, 100); r++) {
      const row = [];
      for (let c = 0; c < Math.min(sheet.cols, 26); c++) {
        const addr = toCellAddress(`${String.fromCharCode(65 + c)}${r + 1}`);
        const cell = sheet.cells[addr];
        if (cell && cell.kind === "literal") {
          row.push(cell.value);
        } else {
          row.push("");
        }
      }
      rows.push(row.join(","));
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheet.name}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading spreadsheet...</div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="error-container">
        <div className="error-message">Sheet not found</div>
      </div>
    );
  }

  return (
    <div className="spreadsheet-app">
      {/* Header Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <h1 className="sheet-title">{sheet.name}</h1>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-button" onClick={exportCSV}>
            <svg
              className="icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M2 10V14H14V10M8 2V11M8 11L5 8M8 11L11 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <FormulaBar
        selectedCell={selectedCell}
        value={formulaBarValue}
        onChange={handleFormulaBarChange}
        onSubmit={handleFormulaBarSubmit}
        onCancel={handleEndEdit}
        isEditing={!!editingCell}
        onStartEdit={handleFormulaBarStartEdit}
      />

      {/* Grid */}
      <div className="grid-wrapper">
        <Grid
          sheet={sheet}
          computedValues={sheet.computedValues}
          onCellUpdate={handleCellUpdate}
          selectedCell={selectedCell}
          onCellSelect={handleCellSelect}
          editingCell={editingCell}
          onStartEdit={handleStartEdit}
          onEndEdit={handleEndEdit}
          editValue={editValue}
          onEditValueChange={handleEditValueChange}
        />
      </div>
    </div>
  );
}
