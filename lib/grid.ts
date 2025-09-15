import { CellAddress, toCellAddress } from "@/types";

// Convert column index to letter(s) (0 -> A, 25 -> Z, 26 -> AA)
export function colToLetter(col: number): string {
  let letter = "";
  while (col >= 0) {
    letter = String.fromCharCode((col % 26) + 65) + letter;
    col = Math.floor(col / 26) - 1;
  }
  return letter;
}

// Convert letter(s) to column index (A -> 0, Z -> 25, AA -> 26)
export function letterToCol(letters: string): number {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 65 + 1);
  }
  return col - 1;
}

// Parse a cell address with absolute/relative refs ($A$1, A$1, $A1, A1)
export function parseAddress(addr: string): {
  col: number;
  row: number;
  absoluteCol: boolean;
  absoluteRow: boolean;
} {
  const match = addr.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell address: ${addr}`);
  }

  const [, dollarCol, letters, dollarRow, digits] = match;

  return {
    col: letterToCol(letters),
    row: parseInt(digits) - 1,
    absoluteCol: dollarCol === "$",
    absoluteRow: dollarRow === "$",
  };
}

// Format a cell address with absolute/relative refs
export function formatAddress(
  col: number,
  row: number,
  absoluteCol: boolean = false,
  absoluteRow: boolean = false
): CellAddress {
  const colPart = absoluteCol ? "$" : "";
  const rowPart = absoluteRow ? "$" : "";
  return toCellAddress(`${colPart}${colToLetter(col)}${rowPart}${row + 1}`);
}

// Parse a range (A1:B3)
export function parseRange(range: string): {
  start: CellAddress;
  end: CellAddress;
} {
  const parts = range.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid range: ${range}`);
  }

  return {
    start: toCellAddress(parts[0].trim()),
    end: toCellAddress(parts[1].trim()),
  };
}

// Get all cells in a range
export function getCellsInRange(
  startAddr: CellAddress,
  endAddr: CellAddress
): CellAddress[] {
  const start = parseAddress(startAddr);
  const end = parseAddress(endAddr);

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const cells: CellAddress[] = [];

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells.push(formatAddress(col, row));
    }
  }

  return cells;
}

// Adjust a cell reference when rows/columns are inserted or deleted
export function adjustReference(
  addr: CellAddress,
  insertedAt: { row?: number; col?: number },
  deletedAt: { row?: number; col?: number },
  isAbsolute: { col: boolean; row: boolean }
): CellAddress {
  const parsed = parseAddress(addr);
  let { col, row } = parsed;

  // Handle insertions
  if (
    insertedAt.col !== undefined &&
    !isAbsolute.col &&
    col >= insertedAt.col
  ) {
    col++;
  }
  if (
    insertedAt.row !== undefined &&
    !isAbsolute.row &&
    row >= insertedAt.row
  ) {
    row++;
  }

  // Handle deletions
  if (deletedAt.col !== undefined && !isAbsolute.col && col > deletedAt.col) {
    col--;
  }
  if (deletedAt.row !== undefined && !isAbsolute.row && row > deletedAt.row) {
    row--;
  }

  return formatAddress(col, row, isAbsolute.col, isAbsolute.row);
}

// Transform a formula when copying/pasting (relative refs change, absolute don't)
export function transformFormula(
  formula: string,
  fromCell: CellAddress,
  toCell: CellAddress
): string {
  const from = parseAddress(fromCell);
  const to = parseAddress(toCell);

  const colOffset = to.col - from.col;
  const rowOffset = to.row - from.row;

  // Simple regex-based transformation (for basic cases)
  // In production, you'd use the AST for accurate transformation
  return formula.replace(
    /(\$?)([A-Z]+)(\$?)(\d+)/g,
    (match, dollarCol, letters, dollarRow, digits) => {
      if (dollarCol && dollarRow) {
        // Fully absolute, don't change
        return match;
      }

      let col = letterToCol(letters);
      let row = parseInt(digits) - 1;

      if (!dollarCol) {
        col += colOffset;
      }
      if (!dollarRow) {
        row += rowOffset;
      }

      // Ensure valid bounds
      if (col < 0 || row < 0) {
        return "#REF!";
      }

      return `${dollarCol}${colToLetter(col)}${dollarRow}${row + 1}`;
    }
  );
}

// Check if a cell address is valid for given sheet dimensions
export function isValidAddress(
  addr: CellAddress,
  maxRows: number,
  maxCols: number
): boolean {
  try {
    const parsed = parseAddress(addr);
    return (
      parsed.col >= 0 &&
      parsed.col < maxCols &&
      parsed.row >= 0 &&
      parsed.row < maxRows
    );
  } catch {
    return false;
  }
}

// Get neighboring cell address (for arrow key navigation)
export function getNeighbor(
  addr: CellAddress,
  direction: "up" | "down" | "left" | "right",
  maxRows: number,
  maxCols: number
): CellAddress | null {
  const parsed = parseAddress(addr);
  let { col, row } = parsed;

  switch (direction) {
    case "up":
      if (row > 0) row--;
      else return null;
      break;
    case "down":
      if (row < maxRows - 1) row++;
      else return null;
      break;
    case "left":
      if (col > 0) col--;
      else return null;
      break;
    case "right":
      if (col < maxCols - 1) col++;
      else return null;
      break;
  }

  return formatAddress(col, row);
}
