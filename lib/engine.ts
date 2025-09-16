import {
  Sheet,
  Cell,
  CellAddress,
  FormulaAst,
  CellValue,
  EvalResult,
  ExplainTrace,
} from "@/types";
import { getCellsInRange } from "./grid";

// Simplified Dependency Graph
export class DependencyGraph {
  private dependencies: Map<CellAddress, Set<CellAddress>> = new Map();
  private dependents: Map<CellAddress, Set<CellAddress>> = new Map();

  addDependency(from: CellAddress, to: CellAddress): void {
    if (!this.dependencies.has(from)) {
      this.dependencies.set(from, new Set());
    }
    this.dependencies.get(from)!.add(to);

    if (!this.dependents.has(to)) {
      this.dependents.set(to, new Set());
    }
    this.dependents.get(to)!.add(from);
  }

  removeDependencies(cell: CellAddress): void {
    const deps = this.dependencies.get(cell);
    if (deps) {
      deps.forEach((dep) => {
        const dependents = this.dependents.get(dep);
        if (dependents) {
          dependents.delete(cell);
        }
      });
      this.dependencies.delete(cell);
    }
  }

  getDependencies(cell: CellAddress): Set<CellAddress> {
    return this.dependencies.get(cell) || new Set();
  }

  getDependents(cell: CellAddress): Set<CellAddress> {
    return this.dependents.get(cell) || new Set();
  }

  hasCycle(from: CellAddress, to: CellAddress): boolean {
    // Check for self-reference first
    if (from === to) {
      return true;
    }

    // Simple DFS cycle detection
    const visited = new Set<CellAddress>();
    const stack = new Set<CellAddress>();

    const dfs = (cell: CellAddress): boolean => {
      if (stack.has(cell)) return true;
      if (visited.has(cell)) return false;

      visited.add(cell);
      stack.add(cell);

      const deps = this.getDependencies(cell);
      for (const dep of deps) {
        if (dep === from || dfs(dep)) {
          return true;
        }
      }

      stack.delete(cell);
      return false;
    };

    return dfs(to);
  }

  getEvaluationOrder(cells: CellAddress[]): CellAddress[] {
    // Simplified topological sort
    const result: CellAddress[] = [];
    const visited = new Set<CellAddress>();

    const visit = (cell: CellAddress): void => {
      if (visited.has(cell)) return;
      visited.add(cell);

      const deps = this.getDependencies(cell);
      deps.forEach((dep) => visit(dep));

      result.push(cell);
    };

    cells.forEach((cell) => visit(cell));
    return result;
  }
}

// Formula evaluation context
export interface EvalContext {
  sheet: Sheet;
  currentCell: CellAddress;
  visited: Set<CellAddress>;
  trace: ExplainTrace[];
}

// Simplified Formula Engine
export class FormulaEngine {
  private depGraph: DependencyGraph = new DependencyGraph();

  private ensureScalar(
    value: CellValue | CellValue[],
    context: string
  ): CellValue {
    if (Array.isArray(value)) {
      throw new Error(`${context}: ranges are not allowed here`);
    }
    return value;
  }

  evaluateSheet(sheet: Sheet): Map<CellAddress, EvalResult> {
    const results = new Map<CellAddress, EvalResult>();
    const formulaCells: CellAddress[] = [];

    // Find all formula cells
    for (const [addr, cell] of Object.entries(sheet.cells)) {
      if (cell.kind === "formula") {
        formulaCells.push(addr as CellAddress);
      }
    }

    // Evaluate in dependency order
    const order = this.depGraph.getEvaluationOrder(formulaCells);

    for (const addr of order) {
      const result = this.evaluateCell(sheet, addr);
      results.set(addr, result);
    }

    return results;
  }

  evaluateCell(
    sheet: Sheet,
    address: CellAddress,
    trace: boolean = false
  ): EvalResult & { explain?: ExplainTrace[] } {
    const cell = sheet.cells[address];

    if (!cell) {
      return { value: null };
    }

    if (cell.kind === "literal") {
      return { value: cell.value };
    }

    if (cell.kind === "error") {
      return {
        value: null,
        error: { code: cell.code, message: cell.message },
      };
    }

    if (cell.kind === "formula") {
      try {
        const ctx: EvalContext = {
          sheet,
          currentCell: address,
          visited: new Set([address]),
          trace: [],
        };

        const value = this.evaluateAst(cell.ast, ctx);

        if (Array.isArray(value)) {
          throw new Error("Bare range cannot be a cell value");
        }

        return trace ? { value, explain: ctx.trace } : { value };
      } catch (error) {
        const errorCode = (error as any)?.code || "EVAL";
        return {
          value: null,
          error: {
            code: errorCode,
            message:
              error instanceof Error ? error.message : "Evaluation error",
          },
        };
      }
    }

    return { value: null };
  }

  private evaluateAst(
    ast: FormulaAst,
    ctx: EvalContext
  ): CellValue | CellValue[] {
    switch (ast.type) {
      case "number":
        return ast.value;

      case "string":
        return ast.value;

      case "boolean":
        return ast.value;

      case "ref":
        return this.evaluateCellRef(ast.address, ctx);

      case "range": {
        const cells = getCellsInRange(ast.start, ast.end);
        return cells.map((addr) => this.evaluateCellRef(addr, ctx));
      }

      case "function":
        return this.evaluateFunction(ast.name, ast.args, ctx);

      case "binary":
        return this.evaluateBinaryOp(ast.op, ast.left, ast.right, ctx);

      case "unary": {
        const value = this.evaluateAst(ast.operand, ctx);
        if (typeof value === "number") {
          return -value;
        }
        throw new Error("Cannot negate non-number");
      }

      default:
        throw new Error("Unknown AST node type");
    }
  }

  private evaluateCellRef(address: CellAddress, ctx: EvalContext): CellValue {
    // Check for cycles
    if (ctx.visited.has(address)) {
      const cycleError = new Error("Circular reference detected");
      (cycleError as any).code = "CYCLE";
      throw cycleError;
    }

    ctx.visited.add(address);

    const cell = ctx.sheet.cells[address];
    if (!cell) {
      return null;
    }

    if (cell.kind === "literal") {
      return cell.value;
    }

    if (cell.kind === "formula") {
      const result = this.evaluateAst(cell.ast, ctx);
      ctx.visited.delete(address);
      return this.ensureScalar(result, "Reference to cell evaluates to range");
    }

    return null;
  }

  // Note: ranges are returned as arrays from evaluateAst and must be
  // consumed by functions (e.g., SUM, AVG). Bare ranges are invalid as
  // final cell values and are rejected in evaluateCell.

  private evaluateFunction(
    name: string,
    args: FormulaAst[],
    ctx: EvalContext
  ): CellValue {
    const upperName = name.toUpperCase();

    switch (upperName) {
      case "SUM": {
        let sum = 0;
        for (const arg of args) {
          const value = this.evaluateAst(arg, ctx);
          if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === "number") sum += v;
            }
          } else if (typeof value === "number") {
            sum += value;
          }
        }
        return sum;
      }

      case "AVG":
      case "AVERAGE": {
        let sum = 0;
        let count = 0;
        for (const arg of args) {
          const value = this.evaluateAst(arg, ctx);
          if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === "number") {
                sum += v;
                count++;
              }
            }
          } else if (typeof value === "number") {
            sum += value;
            count++;
          }
        }
        return count > 0 ? sum / count : 0;
      }

      case "MIN": {
        let min = Infinity;
        for (const arg of args) {
          const value = this.evaluateAst(arg, ctx);
          if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === "number" && v < min) min = v;
            }
          } else if (typeof value === "number" && value < min) {
            min = value;
          }
        }
        return min === Infinity ? 0 : min;
      }

      case "MAX": {
        let max = -Infinity;
        for (const arg of args) {
          const value = this.evaluateAst(arg, ctx);
          if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === "number" && v > max) max = v;
            }
          } else if (typeof value === "number" && value > max) {
            max = value;
          }
        }
        return max === -Infinity ? 0 : max;
      }

      case "COUNT": {
        let count = 0;
        for (const arg of args) {
          const value = this.evaluateAst(arg, ctx);
          if (Array.isArray(value)) {
            count += value.filter((v) => v !== null).length;
          } else if (value !== null) {
            count++;
          }
        }
        return count;
      }

      case "IF": {
        if (args.length !== 3) {
          throw new Error("IF requires exactly 3 arguments");
        }
        const condition = this.ensureScalar(
          this.evaluateAst(args[0], ctx),
          "IF condition"
        );
        const truthy = condition && condition !== 0 && condition !== "";
        return this.ensureScalar(
          this.evaluateAst(args[truthy ? 1 : 2], ctx),
          "IF branch result"
        );
      }

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private evaluateBinaryOp(
    op: string,
    left: FormulaAst,
    right: FormulaAst,
    ctx: EvalContext
  ): CellValue {
    const leftValue = this.evaluateAst(left, ctx);
    const rightValue = this.evaluateAst(right, ctx);

    // Handle arithmetic
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      switch (op) {
        case "+":
          return leftValue + rightValue;
        case "-":
          return leftValue - rightValue;
        case "*":
          return leftValue * rightValue;
        case "/":
          if (rightValue === 0) throw new Error("Division by zero");
          return leftValue / rightValue;
        case "^":
          return Math.pow(leftValue, rightValue);
        case "<":
          return leftValue < rightValue;
        case "<=":
          return leftValue <= rightValue;
        case ">":
          return leftValue > rightValue;
        case ">=":
          return leftValue >= rightValue;
        case "=":
          return leftValue === rightValue;
        case "<>":
          return leftValue !== rightValue;
      }
    }

    // Handle string concatenation
    if (
      op === "+" &&
      (typeof leftValue === "string" || typeof rightValue === "string")
    ) {
      return String(leftValue) + String(rightValue);
    }

    // Handle comparisons
    switch (op) {
      case "=":
        return leftValue === rightValue;
      case "<>":
        return leftValue !== rightValue;
    }

    throw new Error(`Invalid operation: ${leftValue} ${op} ${rightValue}`);
  }

  updateCell(sheet: Sheet, address: CellAddress, cell: Cell): Sheet {
    // Update cell in sheet
    sheet.cells[address] = cell;

    // Rebuild dependencies for formula cells
    if (cell.kind === "formula") {
      this.depGraph.removeDependencies(address);
      // Parse formula to find dependencies
      // (Simplified - in production, walk the AST)
    }

    // Find affected cells
    const affected = this.depGraph.getDependents(address);

    // Recalculate affected cells
    for (const addr of affected) {
      this.evaluateCell(sheet, addr);
      // Update computed values in sheet (omitted in this simplified engine)
    }

    return sheet;
  }

  // Helper to create error cells could be added when we store computed values
}

// Singleton instance
export const engine = new FormulaEngine();
