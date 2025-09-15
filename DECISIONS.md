# Design Decisions

## Design Analysis

### V7 Labs Study

After reviewing [v7labs.com](https://v7labs.com):

**What I liked:**

- Clean, minimal interface with strong focus on data visualization
- Subtle hover states and smooth micro-animations that feel responsive without being distracting
- Professional color palette with excellent contrast for data-heavy interfaces
- Dense information display without feeling cluttered
- Clear visual hierarchy through typography and spacing

**What I would adapt differently:**

- Spreadsheets need more explicit grid lines for cell boundaries
- Cell selection needs to be more prominent than V7's subtle highlights
- Formula bar needs dedicated space unlike V7's inline editing approach

### Paradigm Study

After reviewing [paradigm.co](https://paradigm.co):

**What I liked:**

- Sophisticated typography system with clear hierarchy
- Excellent use of whitespace and breathing room
- Premium feel through subtle shadows and depth
- Consistent spacing system (8px base unit)
- Professional monospace font for data/code

**What I would adapt differently:**

- Their dark theme might be too heavy for all-day spreadsheet use
- Would use tighter spacing for cells to maximize data density
- Need more functional UI elements vs their marketing-focused design

### My Design Synthesis

**How I'll blend both influences:**

- Take V7's data-focused minimalism for the grid itself
- Use Paradigm's sophisticated spacing and typography for UI chrome
- Create a light theme with professional grays from both references
- Subtle blue accent color for selection (not too bright)
- Smooth 200ms transitions for hover states

## Priority 1: Core Functionality Decisions

### Cell Selection

**How will selection work?**

- Single click selects cell and shows blue border
- Visual feedback: 2px blue border (#2188ff) with light blue background
- Active cell shows in formula bar address field
- Hovering shows subtle gray background on row/column headers

### Cell Editing

**Your editing strategy:**

- Double-click starts edit mode
- Direct typing replaces content immediately
- F2 key also starts edit (Excel compatibility)
- Enter commits and moves down, Tab commits and moves right
- Escape cancels edit and restores original value
- Clicking away commits the edit
- Green border during editing to distinguish from selection

### Keyboard Navigation

**Which keys do what?**

- Arrow keys: Move selection one cell in that direction
- Tab: Move right (Shift+Tab for left)
- Enter: Commit edit and move down
- F2: Start editing current cell
- Delete/Backspace: Clear cell content
- Any character: Start editing with that character

### Technical Choices

**How will you implement this?**

- useState for local component state (selected cell, editing state)
- Lifted state in main page component for coordination
- useCallback for event handlers to prevent re-renders
- Single keydown listener at grid level for efficiency
- Focus management using refs for input elements

## Priority 2: Visual Design Decisions

### Visual Hierarchy

**How will users understand the interface?**

- Headers have gray background (#f6f8fa) with medium font weight
- Selected cell has blue border and light blue background
- Formula cells show in blue text when not selected
- Error cells show in red text (#d73a49)
- Currently editing cell has green border

### Spacing System

**Your grid dimensions:**

- Cell width: 100px minimum (can expand with content)
- Cell height: 32px (comfortable for reading)
- Cell padding: 6px vertical, 8px horizontal
- Grid borders: 1px light gray (#e1e4e8)
- 8px base unit for all UI spacing

### Color Palette

**Your chosen colors:**

```css
--bg-primary: #ffffff; /* Cell background */
--bg-secondary: #fafbfc; /* Page background */
--bg-tertiary: #f6f8fa; /* Header background */
--border-default: #e1e4e8; /* Grid lines */
--border-selected: #2188ff; /* Selection */
--text-primary: #24292e; /* Main text */
--accent-error: #d73a49; /* Error states */
```

### Typography

**Your type choices:**

- Data cells: System font stack (-apple-system, BlinkMacSystemFont)
- Formula bar: SF Mono or fallback monospace
- Size: 13px for cells, 14px for UI
- Weight: 400 normal, 500 medium for headers, 600 for title

### Motion & Transitions

**How will things move?**

- 200ms ease transitions on hover states
- 150ms for interactive feedback (clicks)
- No animation on cell selection (instant feedback needed)
- Subtle transform on button hover (translateY -1px)

## Priority 3: Formula Engine Decisions

### Formula Selection

**Which 3-5 formulas did you choose?**

1. **SUM** - Essential for any spreadsheet, demonstrates range handling
2. **AVERAGE** - Common statistical function, builds on SUM logic
3. **Basic arithmetic** (+, -, \*, /) - Fundamental operations
4. **IF** - Adds logical capabilities, enables conditional calculations
5. **MIN/MAX** - Useful comparison functions, simple to implement

### Why These Formulas?

**Your rationale:**

- These cover 80% of typical spreadsheet use cases
- They demonstrate range processing, aggregation, and conditionals
- Good balance of complexity without overengineering
- Each builds on similar evaluation patterns (iterate and aggregate)
- Avoided complex financial/date functions due to time constraints

### Parser Implementation

**Your parsing approach:**

- Tokenizer/Lexer approach for clarity
- Recursive descent parser for simplicity
- Operator precedence through precedence climbing
- Simple regex for cell reference detection
- Basic error recovery (return error node vs crash)

### Evaluation Strategy

**How formulas get calculated:**

- Build dependency graph on formula entry
- Simple DFS for cycle detection
- Full recalculation for now (no incremental)
- Errors propagate but don't crash evaluation
- Simple memoization for repeated references

## Trade-offs & Reflection

### What I Prioritized

1. **Working core functionality** - Users must be able to edit cells
2. **Professional appearance** - This needs to look production-ready
3. **Code clarity** - Clean, understandable code over clever optimizations

### What I Sacrificed

1. **Complex formulas** - Stuck to basics that work reliably
2. **Cell formatting** - No bold, colors, alignment options
3. **Performance optimization** - Full re-renders, no virtualization
4. **Copy/paste** - Would require clipboard API integration
5. **Undo/redo** - Needs proper command pattern implementation

### Technical Debt

**Shortcuts taken:**

- No virtualization for large sheets (renders all visible cells)
- Formula evaluation not optimized (recalculates everything)
- No proper error boundaries in React components
- Simplified formula parser (no complex expressions)
- No accessibility attributes (ARIA labels missing)

### Proud Moments

**What worked well:**

- Clean component separation (Grid, Cell, FormulaBar)
- Smooth keyboard navigation feels natural
- Visual design looks genuinely professional
- Formula parser handles basic cases elegantly
- Type safety throughout with TypeScript

### Learning Experience

**What you learned:**

- Spreadsheets are deceptively complex even for basic features
- Keyboard navigation requires careful event handling
- Focus management in React needs explicit attention
- Formula parsing benefits from formal grammar approach
- Production polish takes significant time investment

## Time Breakdown

**How you spent your time:**

- Setup & Planning: 20 minutes
- Core Functionality: 90 minutes
- Visual Design: 60 minutes
- Formula Engine: 40 minutes
- Testing & Polish: 20 minutes
- Documentation: 10 minutes

**If you had 1 more hour:**

- Add copy/paste functionality with Ctrl+C/V
- Implement basic undo/redo
- Add CSV import (not just export)
- Improve formula error messages
- Add more keyboard shortcuts (Ctrl+Arrow for jumping)

## Final Notes

This implementation focuses on delivering a genuinely usable spreadsheet that feels professional rather than a tech demo with many half-working features. The design draws from modern data tools while maintaining the familiarity users expect from spreadsheets.

The formula engine is intentionally simple but complete for the implemented functions. Given more time, I would add a proper AST visitor pattern and incremental computation, but the current approach is maintainable and debuggable.

The visual design prioritizes clarity and professionalism. Every pixel is considered - from the 2px selection border to the subtle hover states. This attention to detail is what separates production software from prototypes.
