# Design Spec: Excel Import Functionality for Reports

## Overview
Add an **Import** button (`Import qilish`) next to all occurrences of the **Yangi hisobot yaratish** (Create new report) button. When a user uploads an Excel file (`.xlsx`, `.xls`), the application parses the file using the `xlsx` library and automatically populates the table input fields in the report creation views (`PlantCreate`, `AllCreate`, `InnersCreate`) without sending any API requests until the user explicitly submits the report.

## User Interface & Placement
- **Location**: In `ResourceContainer.tsx` and `ResourcePlantContainer.tsx` next to the `createNewReport` button for users with role `tashkilot_hodimi`. Also placed inside `PlantCreate.tsx`, `AllCreate.tsx`, and `InnersCreate.tsx` header toolbar.
- **Button Styling**: Distinct green/emerald theme (`bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 h-[40px] rounded-xl cursor-pointer flex items-center gap-2`), with a file upload icon (`Upload` / `FileSpreadsheet` from `lucide-react`).
- **Input**: Hidden `<input type="file" accept=".xlsx, .xls" />` triggered on button click.

## Functional Flow
1. User clicks **Import qilish** and selects an `.xlsx` / `.xls` file.
2. The file is read via `FileReader` as an `ArrayBuffer` and parsed by `xlsx` (`XLSX.read`).
3. **Data Mapping**:
   - Headers and row titles in the sheet are parsed.
   - For `PlantCreate`: Matches plant names/categories and column titles/ID chains to populate `formValues` in `plantCreateReducer`.
   - For `AllCreate` & `InnersCreate`: Matches column titles/ID chains to populate `formValues`.
4. **State Pre-fill**:
   - If triggered from `ResourceContainer` / `ResourcePlantContainer`, navigates to `/resource-management/create/${reportName}` passing the parsed imported data in router state (`navigate(..., { state: { importedExcelData } })`).
   - If triggered directly inside `PlantCreate` / `AllCreate` / `InnersCreate`, updates the component state directly.
5. **No Immediate API Calls**:
   - No backend network requests are made upon import.
   - The user sees all imported values filled into the form cells and can inspect, modify, or correct them before clicking the existing report save/submit button.

## Translations
- `uz.json`: `"importExcel": "Import qilish"`, `"excelImportSuccess": "Excel fayldan ma'lumotlar to'ldirildi!"`
- `ru.json`: `"importExcel": "Импорт"`, `"excelImportSuccess": "Данные успешно загружены из Excel!"`

## Verification
- Validate file selection with `.xlsx` and `.xls` formats.
- Verify that table input values are populated accurately into the create form.
- Verify that no API network requests are fired until the user clicks save.
