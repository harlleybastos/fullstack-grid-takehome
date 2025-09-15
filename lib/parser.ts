import { FormulaAst, toCellAddress } from "@/types";

// Token types for lexer
export type TokenType =
  | "NUMBER"
  | "STRING"
  | "CELL_REF"
  | "RANGE"
  | "FUNCTION"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COLON"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// Simplified Tokenizer/Lexer
export class Lexer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    // Remove leading = if present
    this.input = input.startsWith("=") ? input.substring(1) : input;
  }

  nextToken(): Token {
    // Skip whitespace
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }

    if (this.pos >= this.input.length) {
      return { type: "EOF", value: "", pos: this.pos };
    }

    const startPos = this.pos;
    const char = this.input[this.pos];

    // Check for operators
    if ("+-*/^<>=".includes(char)) {
      this.pos++;
      // Check for two-character operators
      if (this.pos < this.input.length) {
        const nextChar = this.input[this.pos];
        if (
          (char === "<" && (nextChar === "=" || nextChar === ">")) ||
          (char === ">" && nextChar === "=")
        ) {
          this.pos++;
          return { type: "OPERATOR", value: char + nextChar, pos: startPos };
        }
      }
      return { type: "OPERATOR", value: char, pos: startPos };
    }

    // Check for parentheses
    if (char === "(") {
      this.pos++;
      return { type: "LPAREN", value: "(", pos: startPos };
    }
    if (char === ")") {
      this.pos++;
      return { type: "RPAREN", value: ")", pos: startPos };
    }

    // Check for comma
    if (char === ",") {
      this.pos++;
      return { type: "COMMA", value: ",", pos: startPos };
    }

    // Check for colon (range operator)
    if (char === ":") {
      this.pos++;
      return { type: "COLON", value: ":", pos: startPos };
    }

    // Check for strings (quoted)
    if (char === '"') {
      this.pos++;
      let value = "";
      while (this.pos < this.input.length && this.input[this.pos] !== '"') {
        value += this.input[this.pos];
        this.pos++;
      }
      if (this.pos < this.input.length) this.pos++; // Skip closing quote
      return { type: "STRING", value, pos: startPos };
    }

    // Check for numbers
    if (
      /\d/.test(char) ||
      (char === "." &&
        this.pos + 1 < this.input.length &&
        /\d/.test(this.input[this.pos + 1]))
    ) {
      let value = "";
      while (
        this.pos < this.input.length &&
        /[\d.]/.test(this.input[this.pos])
      ) {
        value += this.input[this.pos];
        this.pos++;
      }
      return { type: "NUMBER", value, pos: startPos };
    }

    // Check for cell references or functions
    if (/[A-Za-z]/.test(char)) {
      let value = "";

      // Read letters
      while (
        this.pos < this.input.length &&
        /[A-Za-z]/.test(this.input[this.pos])
      ) {
        value += this.input[this.pos].toUpperCase();
        this.pos++;
      }

      // Check if it's followed by a number (cell reference)
      if (this.pos < this.input.length && /\d/.test(this.input[this.pos])) {
        // It's a cell reference
        while (
          this.pos < this.input.length &&
          /\d/.test(this.input[this.pos])
        ) {
          value += this.input[this.pos];
          this.pos++;
        }
        return { type: "CELL_REF", value, pos: startPos };
      }

      // Check if it's followed by a parenthesis (function)
      if (this.pos < this.input.length && this.input[this.pos] === "(") {
        return { type: "FUNCTION", value, pos: startPos };
      }

      // Otherwise treat as cell reference (might be incomplete)
      return { type: "CELL_REF", value, pos: startPos };
    }

    // Unknown character
    this.pos++;
    return { type: "EOF", value: char, pos: startPos };
  }

  peek(): Token {
    const savedPos = this.pos;
    const token = this.nextToken();
    this.pos = savedPos;
    return token;
  }
}

// Simplified Parser
export class Parser {
  private lexer: Lexer;
  private current: Token;

  constructor(input: string) {
    this.lexer = new Lexer(input);
    this.current = this.lexer.nextToken();
  }

  parse(): FormulaAst {
    const result = this.parseExpression(0);
    if (this.current.type !== "EOF") {
      throw new Error(`Unexpected token: ${this.current.value}`);
    }
    return result;
  }

  private parseExpression(minPrecedence: number = 0): FormulaAst {
    let left = this.parsePrimary();

    while (this.current.type === "OPERATOR") {
      const op = this.current.value;
      const precedence = PRECEDENCE[op] || 0;

      if (precedence < minPrecedence) break;

      this.advance();
      const right = this.parseExpression(precedence + 1);

      left = {
        type: "binary",
        op: op as any,
        left,
        right,
      };
    }

    return left;
  }

  private parsePrimary(): FormulaAst {
    const token = this.current;

    // Numbers
    if (token.type === "NUMBER") {
      this.advance();
      return { type: "number", value: parseFloat(token.value) };
    }

    // Strings
    if (token.type === "STRING") {
      this.advance();
      return { type: "string", value: token.value };
    }

    // Cell references
    if (token.type === "CELL_REF") {
      const cellRef = token.value;
      this.advance();

      // Check for range
      if (this.current.type === "COLON") {
        this.advance();
        const nextToken = this.current;
        if (nextToken.type !== "CELL_REF") {
          throw new Error("Expected cell reference after colon");
        }
        const endRef = nextToken.value;
        this.advance();
        return {
          type: "range",
          start: toCellAddress(cellRef),
          end: toCellAddress(endRef),
        };
      }

      return {
        type: "ref",
        address: toCellAddress(cellRef),
        absolute: { col: false, row: false },
      };
    }

    // Functions
    if (token.type === "FUNCTION") {
      const name = token.value;
      this.advance();
      this.expect("LPAREN");

      const args: FormulaAst[] = [];

      if (this.current.type !== "RPAREN") {
        args.push(this.parseExpression(0));

        while (this.current.type === "COMMA") {
          this.advance();
          args.push(this.parseExpression(0));
        }
      }

      this.expect("RPAREN");

      return {
        type: "function",
        name,
        args,
      };
    }

    // Parenthesized expressions
    if (token.type === "LPAREN") {
      this.advance();
      const expr = this.parseExpression(0);
      this.expect("RPAREN");
      return expr;
    }

    // Unary minus
    if (token.type === "OPERATOR" && token.value === "-") {
      this.advance();
      return {
        type: "unary",
        op: "-",
        operand: this.parsePrimary(),
      };
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  private advance(): void {
    this.current = this.lexer.nextToken();
  }

  private expect(type: TokenType): void {
    if (this.current.type !== type) {
      throw new Error(`Expected ${type} but got ${this.current.type}`);
    }
    this.advance();
  }
}

// Operator precedence table
export const PRECEDENCE: Record<string, number> = {
  "=": 1,
  "<>": 1,
  "<": 2,
  "<=": 2,
  ">": 2,
  ">=": 2,
  "+": 3,
  "-": 3,
  "*": 4,
  "/": 4,
  "^": 5,
};

// Helper to parse a formula string
export function parseFormula(input: string): FormulaAst {
  try {
    const parser = new Parser(input);
    return parser.parse();
  } catch (error) {
    // Return an error node on parse failure
    throw new Error(
      `Parse error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
