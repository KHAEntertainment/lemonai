# Phase 6 – Replace xlsx/node-xlsx with ExcelJS

Summary
- Goal: Eliminate high-severity vulnerabilities from xlsx by migrating both backend and frontend to ExcelJS.
- Scope:
  - Backend: Replace node-xlsx with ExcelJS and convert XLSX reading to async (preserve API/output)
  - Frontend: Replace xlsx in xlsxPreview.vue with ExcelJS (preserve UI/format)
- Plan source: phase6/PHASE_6_XLSX_REPLACEMENT_PLAN.md

Motivation
- Vulnerabilities: Prototype Pollution (GHSA-4r6h-8v6p-xvw6) and ReDoS (GHSA-5pgg-2g8v-p4x9) in xlsx
- node-xlsx depends on xlsx and inherits the same vulnerabilities
- ExcelJS is actively maintained and has no known vulnerabilities currently

Implementation (Backend)
- Dependencies:
  - Remove: node-xlsx@^0.24.0
  - Add: exceljs@^4.4.0
- Code changes:
  - src/runtime/read_xlsx_optimized.js
    - Use ExcelJS.Workbook; await workbook.xlsx.readFile(filePath)
    - Convert ExcelJS worksheet to node-xlsx-like [{ name, data }] shape
    - Handle ExcelJS 1-indexed row.values via slice(1)
    - Normalize cell values to strings and map null/undefined to '' for backward compatibility
    - Keep markdown conversion, truncation, and summary logic unchanged
    - Make readXlsxFile async and update call sites
  - src/runtime/read_file.js
    - Remove unused node-xlsx import
    - Await readXlsxOptimized() and return result.content

Implementation (Frontend)
- Dependencies (frontend/package.json):
  - Remove: xlsx@^0.18.5
  - Add: exceljs@^4.4.0
- Code changes:
  - frontend/src/components/office/xlsxPreview.vue
    - Replace import * as XLSX from 'xlsx' with import { Workbook } from 'exceljs'
    - await workbook.xlsx.load(arrayBuffer)
    - Access first worksheet and iterate rows with includeEmpty: true
    - Use row.values.slice(1), mapping null/undefined to ''
    - Preserve table structure and rendering

Backward Compatibility
- Same output format (backend): markdown table from first rows with same truncation behavior and summary
- Same UI behavior (frontend): table headers/rows render the same, empty cells show as ''
- Functions consuming backend output remain unaffected

Testing & Validation
- Backend
  - Unit/Smoke: Ensure module loads and reads non-XLSX files; manual smoke for XLSX on local samples
  - Markdown output parity: Compare on small/multiple-sheet workbooks
  - Truncation logic: Large workbook test
- Frontend
  - Build with Vite and smoke test in dev server
  - Visual check: small and multi-sheet files
- Security
  - pnpm audit (root and frontend)
  - Confirm no references to xlsx/node-xlsx remain

Risk & Mitigation
- Async conversion: Wrapped in try/catch; read_file remains async
- 1-indexed arrays: Always slice(1)
- Browser bundling: If exceljs import causes Node polyfill issues, fallback to exceljs/dist/exceljs.min.js

Checklist
- [ ] Backend: Dependencies updated (exceljs added, node-xlsx removed)
- [ ] Backend: read_xlsx_optimized.js migrated to ExcelJS, async, 1-indexed handled
- [ ] Backend: read_file.js awaits async reader
- [ ] Backend: Smoke tests pass; output format parity confirmed
- [ ] Frontend: Dependencies updated (exceljs added, xlsx removed)
- [ ] Frontend: xlsxPreview.vue migrated to ExcelJS and renders as before
- [ ] Frontend: Build passes; manual preview verified
- [ ] Security: Audits clean; no xlsx/node-xlsx references remain

PR Notes for Reviewers
- This is an internal refactor to eliminate vulnerabilities without changing externally observed behavior
- Pay special attention to handling of empty cells and 1-indexed values
- Review markdown output diffs on representative XLSX files if available

References
- Plan: phase6/PHASE_6_XLSX_REPLACEMENT_PLAN.md
- Advisories: GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9
- Library: https://github.com/exceljs/exceljs
