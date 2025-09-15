"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, CellAddress, toCellAddress } from "@/types";
import CellComponent from "./Cell";

interface GridProps {
  sheet: Sheet;
  computedValues: Record<string, any>;
  onCellUpdate: (address: CellAddress, value: string) => Promise<void>;
  selectedCell: CellAddress | null;
  onCellSelect: (address: CellAddress) => void;
  editingCell: CellAddress | null;
  onStartEdit: (address: CellAddress) => void;
  onEndEdit: () => void;
  editValue: string;
  onEditValueChange: (value: string) => void;
}

export default function Grid({
  sheet,
  computedValues,
  onCellUpdate,
  selectedCell,
  onCellSelect,
  editingCell,
  onStartEdit,
  onEndEdit,
  editValue,
  onEditValueChange,
}: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedCell) return;

      // Parse current position
      const match = selectedCell.match(/^([A-Z]+)(\d+)$/);
      if (!match) return;

      const colLetters = match[1];
      const row = parseInt(match[2]) - 1;
      const col = colLetters.charCodeAt(0) - 65; // Simple for single letters

      let newCol = col;
      let newRow = row;

      // If editing, only handle Enter, Tab, Escape
      if (editingCell) {
        switch (e.key) {
          case "Enter":
            e.preventDefault();
            onEndEdit();
            // Move down
            if (row < sheet.rows - 1) {
              newRow = row + 1;
              const newAddr = toCellAddress(`${colLetters}${newRow + 1}`);
              onCellSelect(newAddr);
            }
            break;
          case "Tab":
            e.preventDefault();
            onEndEdit();
            // Move right
            if (col < sheet.cols - 1) {
              newCol = col + 1;
              const newAddr = toCellAddress(
                `${String.fromCharCode(65 + newCol)}${row + 1}`
              );
              onCellSelect(newAddr);
            }
            break;
          case "Escape":
            e.preventDefault();
            onEndEdit();
            break;
        }
        return;
      }

      // Navigation when not editing
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (row > 0) newRow = row - 1;
          break;
        case "ArrowDown":
          e.preventDefault();
          if (row < sheet.rows - 1) newRow = row + 1;
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (col > 0) newCol = col - 1;
          break;
        case "ArrowRight":
          e.preventDefault();
          if (col < sheet.cols - 1) newCol = col + 1;
          break;
        case "Enter":
          e.preventDefault();
          onStartEdit(selectedCell);
          break;
        case "Tab":
          e.preventDefault();
          if (col < sheet.cols - 1) newCol = col + 1;
          break;
        case "F2":
          e.preventDefault();
          onStartEdit(selectedCell);
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          onCellUpdate(selectedCell, "");
          break;
        default:
          // Start editing on any character input
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            onStartEdit(selectedCell);
            onEditValueChange(e.key);
          }
          break;
      }

      // Update selection if position changed
      if (newCol !== col || newRow !== row) {
        const newAddr = toCellAddress(
          `${String.fromCharCode(65 + newCol)}${newRow + 1}`
        );
        onCellSelect(newAddr);
      }
    },
    [
      selectedCell,
      editingCell,
      sheet.rows,
      sheet.cols,
      onCellSelect,
      onStartEdit,
      onEndEdit,
      onCellUpdate,
      onEditValueChange,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Generate column headers
  const columnHeaders = Array.from(
    { length: Math.min(sheet.cols, 26) },
    (_, i) => String.fromCharCode(65 + i)
  );

  // Generate visible rows (limit for performance)
  const visibleRows = Math.min(sheet.rows, 50);

  return (
    <div ref={gridRef} className="grid-container">
      <table className="spreadsheet-grid">
        <thead>
          <tr>
            <th className="corner-cell"></th>
            {columnHeaders.map((letter, colIndex) => (
              <th
                key={letter}
                className={`column-header ${
                  hoveredCol === colIndex ? "hovered" : ""
                }`}
                onMouseEnter={() => setHoveredCol(colIndex)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: visibleRows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              <td
                className={`row-header ${
                  hoveredRow === rowIndex ? "hovered" : ""
                }`}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {rowIndex + 1}
              </td>
              {columnHeaders.map((letter, colIndex) => {
                const address = toCellAddress(`${letter}${rowIndex + 1}`);
                const cell = sheet.cells[address];
                const isSelected = selectedCell === address;
                const isEditing = editingCell === address;
                const isHighlighted =
                  hoveredCol === colIndex || hoveredRow === rowIndex;

                return (
                  <CellComponent
                    key={address}
                    address={address}
                    cell={cell}
                    computedValue={computedValues[address]}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    isHighlighted={isHighlighted}
                    editValue={isEditing ? editValue : ""}
                    onClick={() => {
                      if (!isEditing) {
                        onCellSelect(address);
                      }
                    }}
                    onDoubleClick={() => {
                      onCellSelect(address);
                      onStartEdit(address);
                    }}
                    onEditChange={onEditValueChange}
                    onEditSubmit={() => {
                      onCellUpdate(address, editValue);
                      onEndEdit();
                    }}
                    onEditCancel={onEndEdit}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
