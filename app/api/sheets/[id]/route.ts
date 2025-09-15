import { NextRequest, NextResponse } from "next/server";
import { sheetStore } from "@/lib/state";
import { engine } from "@/lib/engine";
import { SheetPatchSchema, validateRequest } from "@/lib/validation";
import { toCellAddress } from "@/types";
import { parseFormula } from "@/lib/parser";

// GET /api/sheets/[id] - Get sheet snapshot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = sheetStore.get(params?.id);

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // Evaluate all formulas and include computed values
    const evaluatedSheet = { ...sheet };
    const results = engine.evaluateSheet(sheet);

    // Add computed values as a separate field for display
    const computedValues: Record<string, any> = {};
    for (const [addr, result] of results.entries()) {
      if (result.error) {
        computedValues[addr] = `#${result.error.code}!`;
      } else {
        computedValues[addr] = result.value;
      }
    }

    return NextResponse.json({
      ...evaluatedSheet,
      computedValues,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sheet" },
      { status: 500 }
    );
  }
}

// PATCH /api/sheets/[id] - Apply cell edits
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = sheetStore.get(params.id);

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateRequest(SheetPatchSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { edits } = validation.data;

    // Apply each edit to the sheet
    for (const edit of edits) {
      const addr = toCellAddress(edit.addr);

      if (edit.kind === "clear") {
        delete sheet.cells[addr];
      } else if (edit.kind === "literal") {
        sheet.cells[addr] = {
          kind: "literal",
          value: edit.value!,
        };
      } else if (edit.kind === "formula") {
        // Parse formula and create AST
        try {
          const ast = parseFormula(edit.formula!);
          sheet.cells[addr] = {
            kind: "formula",
            src: edit.formula!,
            ast,
          };
        } catch (error) {
          // If parsing fails, store as error cell
          sheet.cells[addr] = {
            kind: "error",
            code: "PARSE",
            message: `Invalid formula: ${edit.formula}`,
          };
        }
      }
    }

    sheet.updatedAt = new Date();
    sheetStore.update(params.id, sheet);

    // Recalculate all formulas and return computed values
    const results = engine.evaluateSheet(sheet);
    const computedValues: Record<string, any> = {};

    // Process all cells, not just formulas
    for (const [addr, cell] of Object.entries(sheet.cells)) {
      if (cell.kind === "formula") {
        const result = results.get(addr as any);
        if (result) {
          if (result.error) {
            computedValues[addr] = `#${result.error.code}!`;
          } else {
            computedValues[addr] = result.value;
          }
        }
      } else if (cell.kind === "literal") {
        computedValues[addr] = cell.value;
      } else if (cell.kind === "error") {
        computedValues[addr] = `#${cell.code}!`;
      }
    }

    return NextResponse.json({
      ...sheet,
      computedValues,
    });
  } catch (error) {
    console.error("Failed to update sheet:", error);
    return NextResponse.json(
      { error: "Failed to update sheet" },
      { status: 500 }
    );
  }
}
