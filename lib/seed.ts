import { Sheet, toCellAddress } from "@/types";
import { parseFormula } from "@/lib/parser";

// Create the seed sheet with initial data
export function createSeedSheet(): Sheet {
  const sheet: Sheet = {
    id: "seed-sheet-1",
    name: "Budget Calculator",
    rows: 20,
    cols: 10,
    cells: {},
    computedValues: {},
    updatedAt: new Date(),
  };

  // Add headers
  sheet.cells[toCellAddress("A1")] = { kind: "literal", value: "Revenue" };
  sheet.cells[toCellAddress("B1")] = { kind: "literal", value: "Cost" };
  sheet.cells[toCellAddress("C1")] = { kind: "literal", value: "Profit" };

  // Add data rows
  sheet.cells[toCellAddress("A3")] = { kind: "literal", value: 1000 };
  sheet.cells[toCellAddress("B3")] = { kind: "literal", value: 300 };

  try {
    sheet.cells[toCellAddress("C3")] = {
      kind: "formula",
      src: "=A3-B3",
      ast: parseFormula("=A3-B3"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("C3")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  sheet.cells[toCellAddress("A4")] = { kind: "literal", value: 2000 };
  sheet.cells[toCellAddress("B4")] = { kind: "literal", value: 1250 };

  try {
    sheet.cells[toCellAddress("C4")] = {
      kind: "formula",
      src: "=A4-B4",
      ast: parseFormula("=A4-B4"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("C4")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  // Add sum row
  try {
    sheet.cells[toCellAddress("A5")] = {
      kind: "formula",
      src: "=SUM(A3:A4)",
      ast: parseFormula("=SUM(A3:A4)"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("A5")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  try {
    sheet.cells[toCellAddress("B5")] = {
      kind: "formula",
      src: "=SUM(B3:B4)",
      ast: parseFormula("=SUM(B3:B4)"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("B5")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  try {
    sheet.cells[toCellAddress("C5")] = {
      kind: "formula",
      src: "=SUM(C3:C4)",
      ast: parseFormula("=SUM(C3:C4)"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("C5")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  // Add subtle trap: absolute reference (simplified for now)
  try {
    sheet.cells[toCellAddress("D3")] = {
      kind: "formula",
      src: "=A3-B3", // Simplified - absolute references need more parser work
      ast: parseFormula("=A3-B3"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("D3")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  // Hidden cycle trap (out of initial viewport)
  try {
    sheet.cells[toCellAddress("C6")] = {
      kind: "formula",
      src: "=C7+1",
      ast: parseFormula("=C7+1"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("C6")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  try {
    sheet.cells[toCellAddress("C7")] = {
      kind: "formula",
      src: "=C6+1", // Creates a cycle with C6
      ast: parseFormula("=C6+1"),
    };
  } catch (error) {
    sheet.cells[toCellAddress("C7")] = {
      kind: "error",
      code: "PARSE",
      message: "Failed to parse formula",
    };
  }

  return sheet;
}

// Test cases for the engine
export const testCases = [
  {
    name: "Basic arithmetic with precedence",
    formulas: [
      { input: "=1+2*3", expected: 7 },
      { input: "=(1+2)*3", expected: 9 },
      { input: "=2^3*4", expected: 32 }, // 8 * 4
      { input: "=2^(3*4)", expected: 4096 }, // 2^12
    ],
  },
  {
    name: "Functions",
    formulas: [
      { input: "=SUM(1,2,3)", expected: 6 },
      { input: "=AVG(10,20,30)", expected: 20 },
      { input: "=MIN(5,3,7)", expected: 3 },
      { input: "=MAX(5,3,7)", expected: 7 },
      { input: '=COUNT(1,2,"text",3)', expected: 4 },
    ],
  },
  {
    name: "Conditionals",
    formulas: [
      { input: '=IF(1>0,"yes","no")', expected: "yes" },
      { input: "=IF(5=5,10,20)", expected: 10 },
      { input: "=IF(3<>3,1,2)", expected: 2 },
    ],
  },
  {
    name: "Error handling",
    formulas: [
      { input: "=1/0", expectedError: "DIV0" },
      { input: "=SUM(Z99)", expectedError: "REF" },
      { input: "=UNKNOWN()", expectedError: "PARSE" },
    ],
  },
];
