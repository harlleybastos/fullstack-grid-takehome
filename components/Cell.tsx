"use client";

import React, { useRef, useEffect } from "react";
import { Cell, CellAddress } from "@/types";

interface CellProps {
  address: CellAddress;
  cell: Cell | undefined;
  computedValue?: Record<number, string | number>;
  isSelected: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  editValue: string;
  onClick: () => void;
  onDoubleClick: () => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
}

export default function CellComponent({
  address,
  cell,
  computedValue,
  isSelected,
  isEditing,
  isHighlighted,
  editValue,
  onClick,
  onDoubleClick,
  onEditChange,
  onEditSubmit,
  onEditCancel,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const displayValue = () => {
    if (!cell) return "";

    switch (cell.kind) {
      case "literal":
        return String(cell.value);
      case "formula":
        // Show the formula when selected and not editing, computed value otherwise
        if (isSelected && !isEditing) {
          return cell.src;
        }
        // Use computed value if available
        return computedValue !== undefined ? String(computedValue) : "...";
      case "error":
        return `#${cell.code}!`;
      default:
        return "";
    }
  };

  const cellClassName = `
    spreadsheet-cell
    ${isSelected ? "selected" : ""}
    ${isEditing ? "editing" : ""}
    ${isHighlighted ? "highlighted" : ""}
    ${cell?.kind === "error" ? "error" : ""}
    ${cell?.kind === "formula" ? "formula" : ""}
  `.trim();

  if (isEditing) {
    return (
      <td className={cellClassName}>
        <input
          ref={inputRef}
          type="text"
          className="cell-input"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEditSubmit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onEditCancel();
            } else if (e.key === "Tab") {
              e.preventDefault();
              onEditSubmit();
            }
          }}
          onBlur={onEditSubmit}
        />
      </td>
    );
  }

  return (
    <td
      className={cellClassName}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="cell-content">{displayValue()}</div>
    </td>
  );
}
