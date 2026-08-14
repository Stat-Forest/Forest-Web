# Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to import Excel files (`.xlsx`, `.xls`) using an **Import qilish** button placed next to **Yangi hisobot yaratish** across report pages, automatically populating report creation tables without making immediate API calls.

**Architecture:** A reusable `ImportExcelButton` component reads `.xlsx`/`.xls` files using the `xlsx` library, extracts structured rows/cells, and passes the parsed data to report creation forms (`PlantCreate`, `AllCreate`, `InnersCreate`), which pre-fills the form inputs for review before submission.

**Tech Stack:** React, TypeScript, XLSX (`xlsx`), TailwindCSS, Lucide-react icons, React Router DOM, i18next.

## Global Constraints
- Do NOT trigger any backend API requests upon Excel file selection/import.
- All imported data must be pre-filled into local form state (`formValues`, `formGroups`).
- Placement: "Import qilish" button must be rendered next to "Yangi hisobot yaratish" in `ResourceContainer.tsx` and `ResourcePlantContainer.tsx`.

---

### Task 1: Add Translations & Utility for Excel Parsing

**Files:**
- Modify: `src/i18n/languages/uz.json`
- Modify: `src/i18n/languages/ru.json`
- Create: `src/utils/parseExcelReport.ts`

**Interfaces:**
- Produces: `parseExcelFile(file: File): Promise<Array<Record<string, any>>>`

- [ ] **Step 1: Update translation files**

Add keys `importExcel` and `excelImportSuccess` in `uz.json` and `ru.json`.

- [ ] **Step 2: Create Excel parsing helper**

Write `parseExcelReport.ts` using `XLSX.read` and `XLSX.utils.sheet_to_json` to extract rows and header mappings from uploaded Excel spreadsheets.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/languages/uz.json src/i18n/languages/ru.json src/utils/parseExcelReport.ts
git commit -m "feat: add i18n keys and excel parser utility"
```

---

### Task 2: Create Reusable `ImportExcelButton` Component

**Files:**
- Create: `src/components/ImportExcelButton/ImportExcelButton.tsx`

**Interfaces:**
- Consumes: `parseExcelFile` from `src/utils/parseExcelReport.ts`
- Produces: `<ImportExcelButton onImportSuccess={(data) => void} reportName?: string />`

- [ ] **Step 1: Build `ImportExcelButton` component**

Render a styled green button (`Import qilish` / `importExcel`) with a hidden `<input type="file" accept=".xlsx, .xls" />`. When a file is selected, parse it with `parseExcelFile`, handle router navigation to `/resource-management/create/${reportName}` if on list view, or trigger `onImportSuccess` callback.

- [ ] **Step 2: Commit**

```bash
git add src/components/ImportExcelButton/ImportExcelButton.tsx
git commit -m "feat: create ImportExcelButton component"
```

---

### Task 3: Integrate `ImportExcelButton` in `ResourceContainer` and `ResourcePlantContainer`

**Files:**
- Modify: `src/containers/ResourceContainer/ResourceContainer.tsx:660-675`
- Modify: `src/containers/ResourceContainer/ResourcePlantContainer.tsx:660-675`

**Interfaces:**
- Consumes: `ImportExcelButton`

- [ ] **Step 1: Add Import button to `ResourceContainer`**

Place `<ImportExcelButton reportName={reportName} />` right next to the "Yangi hisobot yaratish" button for `user_role === "tashkilot_hodimi"`.

- [ ] **Step 2: Add Import button to `ResourcePlantContainer`**

Place `<ImportExcelButton reportName={reportName} />` right next to the "Yangi hisobot yaratish" button for `user_role === "tashkilot_hodimi"`.

- [ ] **Step 3: Commit**

```bash
git add src/containers/ResourceContainer/ResourceContainer.tsx src/containers/ResourceContainer/ResourcePlantContainer.tsx
git commit -m "feat: integrate Import button next to Yangi hisobot yaratish in report containers"
```

---

### Task 4: Connect Excel Data Pre-filling to Creation Views (`PlantCreate`, `AllCreate`, `InnersCreate`)

**Files:**
- Modify: `src/views/Dashboard/ResourceManagement/Children/CreateReport/PlantCreate.tsx`
- Modify: `src/views/Dashboard/ResourceManagement/Children/CreateReport/AllCreate.tsx`
- Modify: `src/views/Dashboard/ResourceManagement/Children/CreateReport/InnersCreate.tsx`

- [ ] **Step 1: Support `location.state.importedExcelData` and direct Excel upload in `PlantCreate.tsx`**

Check `location.state` for imported Excel data upon component mount. When present or when the inline `<ImportExcelButton>` is used, map Excel sheet values to the form inputs/state using column & plant name matching.

- [ ] **Step 2: Support `location.state.importedExcelData` and direct Excel upload in `AllCreate.tsx` and `InnersCreate.tsx`**

Map Excel column names & values into `formValues` state for `AllCreate` and `InnersCreate`.

- [ ] **Step 3: Verify build and test manually**

Verify TypeScript compilation (`npm run build` / `tsc -b`) and test Excel import behavior.

- [ ] **Step 4: Commit**

```bash
git add src/views/Dashboard/ResourceManagement/Children/CreateReport/
git commit -m "feat: handle Excel data pre-filling in report creation views"
```
