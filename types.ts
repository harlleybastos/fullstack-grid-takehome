// Branded type for cell addresses
export type CellAddress = string & { __brand: "CellAddress" };

// Helper functions for CellAddress
export const toCellAddress = (addr: string): CellAddress => {
  // Validate format (e.g., A1, B12, AA99)
  const valid = /^[A-Z]+[0-9]+$/.test(addr);
  if (!valid) {
    throw new Error(`Invalid cell address format: ${addr}`);
  }
  return addr as CellAddress;
};

export const parseCellAddress = (
  addr: CellAddress
): { col: number; row: number } => {
  // Parse "A1" -> { col: 0, row: 0 }
  const match = addr.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) {
    throw new Error(`Invalid cell address: ${addr}`);
  }

  const [, letters, digits] = match;

  // Convert letters to column index (A=0, B=1, ..., Z=25, AA=26, etc.)
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 65 + 1);
  }
  col = col - 1; // Convert to 0-based index

  const row = parseInt(digits) - 1; // Convert to 0-based index

  return { col, row };
};

export const formatCellAddress = (col: number, row: number): CellAddress => {
  // Format { col: 0, row: 0 } -> "A1"

  // Convert column index to letters
  let letters = "";
  let colNum = col;
  while (colNum >= 0) {
    letters = String.fromCharCode((colNum % 26) + 65) + letters;
    colNum = Math.floor(colNum / 26) - 1;
  }

  // Convert row to 1-based
  const rowStr = String(row + 1);

  return toCellAddress(letters + rowStr);
};

// Cell types (discriminated union)
export type Cell = LiteralCell | FormulaCell | ErrorCell;

export interface LiteralCell {
  kind: "literal";
  value: number | string | boolean;
}

export interface FormulaCell {
  kind: "formula";
  src: string;
  ast: FormulaAst;
}

export interface ErrorCell {
  kind: "error";
  message: string;
  code: "CYCLE" | "REF" | "PARSE" | "DIV0" | "EVAL";
}

// Formula AST nodes
export type FormulaAst =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | CellRef
  | RangeRef
  | FunctionCall
  | BinaryOp
  | UnaryOp;

export interface NumberLiteral {
  type: "number";
  value: number;
}

export interface StringLiteral {
  type: "string";
  value: string;
}

export interface BooleanLiteral {
  type: "boolean";
  value: boolean;
}

export interface CellRef {
  type: "ref";
  address: CellAddress;
  absolute: { col: boolean; row: boolean };
}

export interface RangeRef {
  type: "range";
  start: CellAddress;
  end: CellAddress;
}

export interface FunctionCall {
  type: "function";
  name: string;
  args: FormulaAst[];
}

export interface BinaryOp {
  type: "binary";
  op: "+" | "-" | "*" | "/" | "^" | "<" | "<=" | ">" | ">=" | "=" | "<>";
  left: FormulaAst;
  right: FormulaAst;
}

export interface UnaryOp {
  type: "unary";
  op: "-";
  operand: FormulaAst;
}

// Sheet type
export interface Sheet {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: Record<CellAddress, Cell>;
  computedValues: Record<number, number | string>;
  updatedAt: Date;
}

// Type guard
export const isFormula = (cell: Cell): cell is FormulaCell => {
  return cell.kind === "formula";
};

// Evaluation result types
export type CellValue = number | string | boolean | null;

export interface EvalResult {
  value: CellValue;
  error?: { code: string; message: string };
}

export interface ExplainTrace {
  cell: CellAddress;
  formula?: string;
  dependencies: CellAddress[];
  ranges: Array<{ start: CellAddress; end: CellAddress }>;
  value: CellValue;
}

// API types
export interface CellEdit {
  addr: CellAddress;
  kind: "literal" | "formula" | "clear";
  value?: string | number | boolean;
  formula?: string;
}

export interface SheetCreateRequest {
  name: string;
  rows: number;
  cols: number;
}

export interface EvalRequest {
  id: string;
  addr: CellAddress;
}
