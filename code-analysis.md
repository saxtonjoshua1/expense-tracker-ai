# Export Feature Code Analysis

Comparing three branch implementations of data export functionality for SpendWise Tracker.

---

## Baseline: `main` branch

Before examining the feature branches, the baseline `utils/exportCSV.ts` on `main` already provides a
simple CSV export utility (Date → Description → Category → Amount column order). Each branch builds
on top of this baseline or replaces it entirely.

---

## Version 1 — `feature-data-export-v1`

### Files Changed

| Status   | File                   |
|----------|------------------------|
| Modified | `app/page.tsx`         |
| Modified | `utils/exportCSV.ts`   |

### Architecture Overview

V1 is the smallest possible increment on the baseline. It modifies the existing `exportCSV.ts`
utility and wires it up to a button rendered directly in the Dashboard `<Header>` component via its
`actions` prop. No new files, no new components, no new dependencies.

```
app/page.tsx
  └── <Header actions={<Button onClick={() => exportToCSV(expenses)} />} />
        └── utils/exportCSV.ts (pure function)
```

### Key Components and Their Responsibilities

**`utils/exportCSV.ts`**
A single exported function `exportToCSV(expenses, filename?)`. It:
1. Builds a header row and maps expenses to CSV rows.
2. Creates a `Blob` → object URL → invisible `<a>` element → programmatic click → cleanup.

The only change from `main` is the column order: V1 emits **Date, Category, Amount, Description**
whereas `main` emits **Date, Description, Category, Amount**. The `Description` field is RFC 4180
escaped (wrapped in quotes, internal quotes doubled).

**`app/page.tsx`**
Imports `exportToCSV` and passes a `<Button>` to `<Header>`'s `actions` prop. The call site is
`onClick={() => exportToCSV(expenses)}` — no state, no modal, no intermediate UI.

### Libraries and Dependencies

No new dependencies. Uses only existing browser APIs (`Blob`, `URL.createObjectURL`,
`document.createElement`).

### Implementation Patterns

- **Procedural utility**: the export is a plain side-effectful function, not a hook or class.
- **Inline event handler**: no extracted handler, the arrow function is defined inline in JSX.
- **No user confirmation step**: click → instant download.

### Code Complexity Assessment

Very low. `exportCSV.ts` is ~20 lines. `page.tsx` adds 2 lines of import + the button. Cyclomatic
complexity is essentially 1 (no branching in the export path).

### Error Handling

None. If `Blob` creation or `URL.createObjectURL` throws (e.g., browser quota exceeded), the error
propagates uncaught to the console. There is no user-facing feedback.

### Security Considerations

- CSV injection: `description` is correctly double-quote escaped. However the other fields (`category`,
  formatted date string) are unquoted. Categories are constrained to the 6 app-defined values so
  formula injection via category is not a real risk.
- The DOM manipulation pattern (`appendChild` / `click` / `removeChild`) is a standard, well-understood
  download trigger. `URL.revokeObjectURL` is called synchronously after the click, which is safe
  because the browser defers the actual download request.

### Performance Implications

Negligible. The entire expense dataset is serialised in memory as a string. For very large datasets
(10,000+ rows) this could produce a multi-megabyte string synchronously on the main thread, but in
practice a personal expense tracker rarely reaches that scale.

### Extensibility and Maintainability

Low extensibility: adding a new export format would require duplicating the download logic or
refactoring to a shared helper. The function is not parameterised by format. The column order
difference from `main` is a minor inconsistency that could cause confusion.

---

### Technical Deep Dive — V1

**How does export work technically?**
Pure browser-side: `new Blob([csvString], { type: 'text/csv' })` → `URL.createObjectURL(blob)` →
injected anchor with `download` attribute → `.click()` → `removeChild` + `revokeObjectURL`.

**File generation approach**: In-memory string concatenation via `Array.join`.

**User interaction**: Single click on a `<Button>` — no intermediate UI.

**State management**: None. The component reads `expenses` from `useExpenses()` and passes it
directly to the utility.

**Edge case handling**: Empty `expenses` array produces a CSV with only the header row. No guard
or user warning. Filename defaults to `'expenses.csv'` if not provided.

---

## Version 2 — `feature-data-export-v2`

### Files Changed

| Status | File                                        |
|--------|---------------------------------------------|
| Added  | `utils/exportUtils.ts`                      |
| Added  | `components/export/ExportModal.tsx`         |
| Modified | `components/expenses/ExpenseList.tsx`     |
| Modified | `package.json`                            |

### Architecture Overview

V2 introduces a fully-featured export modal with a two-column layout (config panel + live preview).
The export logic is extracted into a dedicated utility module with per-format functions. A new
`/components/export/` directory establishes a clear domain boundary.

```
components/expenses/ExpenseList.tsx
  └── <ExportModal isOpen expenses onClose />
        ├── State: dateFrom, dateTo, selectedCategories, selectedFormats, filename, exportState
        ├── useMemo: filteredExpenses, totalAmount
        └── utils/exportUtils.ts
              ├── filterExpensesForExport()
              ├── exportToCSV()
              ├── exportToJSON()
              ├── exportToPDF()    ← dynamic import of jsPDF
              └── triggerDownload()  ← shared helper
```

### Key Components and Their Responsibilities

**`utils/exportUtils.ts`**
A utility module exporting:
- `ExportFormat` type union (`'csv' | 'json' | 'pdf'`)
- `ExportFilterOptions` interface
- `filterExpensesForExport(expenses, options)` — pure filter function
- `exportToCSV(expenses, filename)` — CSV serialisation + download
- `exportToJSON(expenses, filename)` — structured JSON with metadata + download
- `exportToPDF(expenses, filename)` — async, dynamically imports jsPDF + jspdf-autotable, generates
  a styled branded PDF report, then triggers download
- `triggerDownload(filename, content, mimeType)` — private shared download helper (DRY)

**`components/export/ExportModal.tsx`**
A large (~400-line) modal component managing:
- A left config panel (date range, category checkboxes, format toggles, filename input)
- A right preview panel (summary stats grid, first-8-rows table with totals footer)
- A footer with status messaging and the export action button
- `ExportState` union: `'idle' | 'loading' | 'success' | 'error'`
- Keyboard accessibility: `Escape` closes the modal via a `document` keydown listener

**`components/expenses/ExpenseList.tsx`**
Modified to hold `exportOpen` boolean state and render `<ExportModal>`. The export button is
positioned in the expense list view (not the dashboard), which is contextually more appropriate —
users are looking at their expense data when they trigger export.

### Libraries and Dependencies Added

| Package           | Version  | Purpose                              |
|-------------------|----------|--------------------------------------|
| `jspdf`           | ^4.2.0   | Client-side PDF generation           |
| `jspdf-autotable` | ^5.0.7   | Table rendering plugin for jsPDF     |

Both are loaded via **dynamic import** (`await import('jspdf')`) inside `exportToPDF`, so they are
not included in the initial JavaScript bundle — they are code-split and only fetched when the user
actually chooses PDF export.

### Implementation Patterns

- **Domain-segregated utilities**: all format logic lives in `exportUtils.ts`; components don't know
  how files are generated.
- **Dynamic imports for heavy deps**: jsPDF (~300 KB gzipped) is split out of the main bundle.
- **`useMemo` for derived data**: `filteredExpenses` and `totalAmount` are memoised and re-computed
  only when their inputs change, keeping the preview table reactive without unnecessary re-renders.
- **Controlled form state**: all filter inputs are fully controlled React state.
- **Export state machine**: `idle → loading → success/error` with timed auto-close on success.
- **`useEffect` cleanup**: the keyboard listener is registered/deregistered correctly when `isOpen`
  changes, preventing listener leaks.

### Code Complexity Assessment

Medium. `ExportModal.tsx` is the largest file (~420 lines) and handles significant local state and
branching UI. `exportUtils.ts` (~90 lines) is well-structured. The complexity is justified by the
feature scope; there is no unnecessary abstraction.

### Error Handling

- The `handleExport` function wraps the export loop in `try/catch`. On failure, `exportState` is
  set to `'error'` and the error message is displayed inline in the modal footer.
- jsPDF errors (e.g., dynamic import failure on an offline connection) surface correctly via the
  catch block.
- Empty filtered set or no format selected: the export button is disabled (`canExport` guard).

### Security Considerations

- All three format generators properly escape content:
  - CSV: description quoted with double-quote doubling.
  - JSON: `JSON.stringify` handles escaping.
  - PDF: values are passed as strings to jsPDF table rows — no XSS vector in a PDF context.
- The `filename` input is user-editable. It is `.trim()`-ed but not sanitised beyond that. On most
  OSes the browser enforces safe filename characters on download, but a path traversal value like
  `../../etc/passwd` would simply produce a file named with that literal string locally — no server
  involved, so no real risk.
- `URL.revokeObjectURL` is called after each download trigger to free memory.

### Performance Implications

- CSV and JSON exports are synchronous and fast.
- PDF export is async and blocks the UI thread briefly during jsPDF layout. For large datasets
  (1,000+ rows) the PDF table layout could take a noticeable moment; no progress indicator is
  shown during this specific phase.
- Multiple formats selected in one click are exported sequentially in a `for...of` loop with
  `await`. This means two or three separate download triggers fire in sequence — browsers may prompt
  for multiple downloads.

### Extensibility and Maintainability

High. Adding a new format requires: (1) adding the type to `ExportFormat`, (2) writing an export
function in `exportUtils.ts`, (3) adding a `FORMAT_OPTIONS` entry in the modal. The filter logic
is fully decoupled from format logic.

---

### Technical Deep Dive — V2

**How does export work technically?**
- CSV/JSON: synchronous string generation → `triggerDownload` helper → Blob → anchor click.
- PDF: `async` function with `await import('jspdf')` → `jsPDF` document built imperatively with
  branded header, summary box, and `autoTable` data table → `doc.save()` triggers browser download.

**File generation approach**: In-memory for CSV/JSON; jsPDF internal canvas for PDF.

**User interaction**: Multi-step modal — configure filters → see live preview → click Export.

**State management**: Local component state (`useState`) + `useMemo` for derived values. No global
state changes; the expense data is passed as a prop.

**Edge case handling**:
- No matching records: export button disabled + empty-state illustration shown in preview.
- No format selected: export button disabled.
- `dateTo` input has `min={dateFrom}` to prevent inverted date ranges.
- "Clear date range" link appears only when at least one date is set.

---

## Version 3 — `feature-data-export-v3`

### Files Changed

| Status   | File                                          |
|----------|-----------------------------------------------|
| Modified | `app/page.tsx`                                |
| Added    | `components/export/CloudExportModal.tsx`      |
| Added    | `utils/exportHistory.ts`                      |

### Architecture Overview

V3 presents a "Cloud Export & Sync Center" modal with five navigable tabs. It introduces export
history persistence, a mock OAuth connection flow, a scheduling UI, a shareable link generator with
QR code visualisation, and integration widget snippets. The entry point shifts back to the
Dashboard (`app/page.tsx`), using a custom gradient button instead of the shared `<Button>`.

```
app/page.tsx
  └── <CloudExportModal isOpen expenses onClose />
        ├── State: activeTab, selectedTemplate, selectedFormat,
        │         selectedDestinations, connectedServices,
        │         exportStatus, emailAddress, scheduleFrequency, exportHistory
        ├── Tab components (defined in same file):
        │     ├── <TemplatesTab>       — 5 report templates + format picker
        │     ├── <DestinationsTab>    — cloud service toggles + email input
        │     ├── <ScheduleTab>        — frequency/time picker + active schedule list
        │     ├── <ShareTab>           — link generator + QR + embed snippets
        │     └── <HistoryTab>         — past export log from localStorage
        └── utils/exportHistory.ts
              ├── getExportHistory()
              ├── addExportRecord()
              ├── generateShareLink()
              ├── clearExportHistory()
              └── estimateFileSize()
```

Sub-components within `CloudExportModal.tsx`:
- `QRCodeDisplay` — renders a procedurally generated SVG QR-code visual
- `StatusDot` — green/grey connection indicator dot
- `CopyButton` — clipboard copy with "Copied!" feedback
- `FormatBadge` — colour-coded format label chip

### Key Components and Their Responsibilities

**`utils/exportHistory.ts`**
Manages a `spendwise_export_history` key in `localStorage` (up to 50 records):
- `ExportRecord` interface: id, template, format, destination, status, timestamp, fileSize,
  expenseCount, optional shareLink.
- `addExportRecord(data)`: prepends a new record with a generated `id` and ISO timestamp.
- `generateShareLink()`: produces a random 12-character alphanumeric token appended to the
  hardcoded domain `https://spendwise.app/share/`.
- `estimateFileSize(count, format)`: estimates file size using fixed bytes-per-row constants
  (CSV: 80B, XLSX: 150B, JSON: 200B, PDF: 500B).
- `clearExportHistory()`: removes the localStorage key.

**`components/export/CloudExportModal.tsx`**
~990 lines, decomposed into tab sub-components. The root component `CloudExportModal`:
- Manages all cross-tab state.
- On export, performs a real local CSV download (using the template's field list as headers), then
  calls `addExportRecord` for each destination, then refreshes history state.
- The 1.8-second `await new Promise(r => setTimeout(r, 1800))` simulates an API round-trip before
  the local download fires.

**`app/page.tsx`**
Adds `showCloudExport` boolean state and renders `<CloudExportModal>`. Uses an inline gradient
`<button>` rather than the app's shared `<Button>` component.

### Libraries and Dependencies Added

None. V3 adds no npm dependencies. It implements QR codes as a custom SVG renderer using a
seeded linear congruential generator (LCG), producing a visually plausible but non-standard QR
pattern.

### Implementation Patterns

- **Tab-based composition**: five named tab sub-components each receive only the state slices they
  need, reducing prop drilling.
- **`useCallback` for stable references**: `refreshHistory` is wrapped in `useCallback` to avoid
  re-creating it on every render (used in a `useEffect` dependency array).
- **Simulated async flows**: OAuth connection (`setTimeout(..., 800)`), export operation
  (`setTimeout(..., 1800)`), and share link generation (`setTimeout(..., 1200)`) all use
  `setTimeout` to mimic network latency. None of these call real APIs.
- **localStorage as persistence layer**: export history survives page reloads.
- **LCG-based pseudo-random QR SVG**: the `QRCodeDisplay` component uses a seeded LCG to render
  a deterministic-looking QR grid given the same URL string input. It correctly renders QR finder
  pattern corners and timing patterns but is not a valid QR code and cannot be scanned.

### Code Complexity Assessment

High. `CloudExportModal.tsx` is ~990 lines and mixes real and mock functionality throughout.
Understanding which features are real vs. simulated requires careful reading. The tab decomposition
helps, but all sub-components live in a single file. The LCG/QR implementation is clever but
adds non-trivial complexity for a purely cosmetic feature.

### Error Handling

Minimal:
- `getExportHistory` wraps `JSON.parse` in a try/catch, returning `[]` on parse error — good.
- `navigator.clipboard.writeText` failure is silently swallowed with `.catch(() => {})`.
- `handleExport` has no try/catch: if the Blob creation or anchor click throws, the error surfaces
  uncaught and `exportStatus` is never reset from `'exporting'`, leaving the button in a loading
  state permanently.
- `handleConnect` has no error path; any OAuth failure would need to be modelled explicitly.

### Security Considerations

- **Fake share links**: `generateShareLink` produces URLs pointing to `https://spendwise.app/share/`
  which is a hardcoded domain not operated by this codebase. These links are recorded in
  localStorage history and could be misleading to users who try to share them.
- **XLSX format listed but not implemented**: The format selector includes 'XLSX' but the actual
  download always produces CSV regardless of format selection (the `handleExport` function only
  has a CSV download branch). Users selecting XLSX would receive a `.xlsx`-suffixed CSV file.
- **Mock OAuth**: the "Connect" flow sets local React state after an 800ms timeout — no real
  OAuth handshake occurs. This is fine for a prototype but dangerous if deployed as-is, as it
  gives users a false sense of security about cloud connectivity.
- **Scheduling is entirely UI-only**: no background job, cron, or server endpoint is created.
  Users who configure a weekly schedule will never receive an export.
- **Inline button instead of shared `<Button>`**: bypasses the shared component's accessibility
  props and consistent focus styling.

### Performance Implications

- The modal is 990 lines but all sub-components are defined in the same module, so no dynamic
  imports. The entire component tree is included in the main bundle.
- The 1.8-second artificial delay before the download fires degrades perceived performance with
  no benefit (there is no actual async work being awaited).
- The QR SVG renders a 21×21 grid of `<rect>` elements (441 DOM nodes) on every render where
  the share link is shown. This is inexpensive but unnecessary given the QR is not functional.

### Extensibility and Maintainability

Low-to-medium. The core export flow (CSV download + localStorage record) works and could be
extended, but the large number of mock features means significant rework is needed before any
of the tab UIs reflect real capabilities. The single-file design at ~990 lines will become
increasingly difficult to navigate. The `TEMPLATES` and `DESTINATIONS` constant arrays are well
structured for extension.

---

### Technical Deep Dive — V3

**How does export work technically?**
The actual download is a CSV generation identical in approach to V1 (Blob → object URL → anchor
click), using the selected template's `fields` array as headers. All other format/destination
options are simulated.

**File generation approach**: In-memory CSV string, regardless of the format selected in the UI.

**User interaction**: Five-tab wizard-style modal. Users configure template, destination, schedule,
and sharing in separate tabs before triggering export in the persistent footer.

**State management**: Significant local state in the root `CloudExportModal` component, passed
down to tabs as props. `useCallback` for the history refresh callback. `localStorage` for
cross-session export history.

**Edge case handling**:
- `estimateFileSize` guards against unknown formats with a `?? 100` fallback.
- `getExportHistory` handles corrupted localStorage gracefully.
- Destinations with `alwaysAvailable: false` that aren't connected show a "Connect" button and
  clicking toggle on them triggers the mock OAuth flow instead of selection.
- Schedule tab limits day-of-month picker to 28 to avoid month-boundary edge cases.

---

## Comparative Summary

| Dimension              | V1 — Simple CSV         | V2 — Multi-Format Modal       | V3 — Cloud Integration          |
|------------------------|-------------------------|-------------------------------|----------------------------------|
| **Files added**        | 0                       | 2                             | 2                                |
| **Files modified**     | 2                       | 2                             | 1                                |
| **New dependencies**   | 0                       | 2 (jspdf, jspdf-autotable)    | 0                                |
| **Lines of code (new)**| ~25                     | ~510                          | ~1,030                           |
| **Export formats**     | CSV only                | CSV, JSON, PDF (real)         | CSV only (others mocked)         |
| **Filtering**          | None                    | Date range + categories        | None                             |
| **Preview**            | None                    | Live data table + stats        | None                             |
| **Error handling**     | None                    | try/catch + inline status      | Minimal, missing in core path   |
| **New dependencies**   | None                    | jsPDF (code-split)             | None                             |
| **Persistence**        | None                    | None                           | Export history in localStorage  |
| **Cloud features**     | None                    | None                           | All mocked (no real API calls)  |
| **Entry point**        | Dashboard header        | Expense list view              | Dashboard header                 |
| **Bundle impact**      | Negligible              | +jsPDF on demand only          | Negligible (large component)     |
| **UX complexity**      | One-click               | Configure → Preview → Export  | Five-tab wizard                  |
| **Production-ready**   | Yes (limited scope)     | Yes                            | Partially (real: CSV + history)  |

---

## Recommendations

### Adopt V2 as the foundation

V2 is the strongest candidate for adoption:
- All three advertised formats (CSV, JSON, PDF) are **actually implemented**.
- The filtering and live preview make it genuinely useful.
- The code is clean, well-separated, and well-typed.
- jsPDF is lazy-loaded so there is no bundle-size penalty for users who never export PDF.
- Error handling is present throughout.

### Cherry-pick from V3

V3 contains two pieces worth extracting into V2:

1. **`utils/exportHistory.ts`** — the localStorage history mechanism is real, well-written, and
   adds meaningful UX. It could be integrated into the V2 `ExportModal` with a history panel.

2. **`CopyButton` and `FormatBadge` sub-components** — small, reusable, and can be moved to
   `components/ui/`.

### Do not ship V3's mocked features

Before any V3 UI surface is shipped, the following require full backend implementation:
- Cloud destination connections (Google Sheets, Dropbox, OneDrive) need OAuth flows.
- Scheduled exports need a server-side scheduler or a service worker with background sync.
- Share links need a backend endpoint to serve the shared report.
- XLSX format needs a real library (e.g., `xlsx` / SheetJS).

### Skip V1 entirely

V1's single-button approach is too limited for the app's current scope and its column order
differs from the baseline without a clear rationale.
