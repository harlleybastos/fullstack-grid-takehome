"use client";

import React, { useEffect, useRef } from "react";
import { CellAddress } from "@/types";

interface FormulaBarProps {
  selectedCell: CellAddress | null;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
}

export default function FormulaBar({
  selectedCell,
  value,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  onStartEdit,
}: FormulaBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="formula-bar">
      <div className="formula-bar-address">
        <span className="address-display">{selectedCell || "A1"}</span>
      </div>
      <div className="formula-bar-divider" />
      <div className="formula-bar-input-container">
        <span className="formula-bar-fx">fx</span>
        <input
          ref={inputRef}
          type="text"
          className="formula-bar-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onStartEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder={
            selectedCell ? "Enter value or formula..." : "Select a cell"
          }
        />
      </div>
    </div>
  );
}
