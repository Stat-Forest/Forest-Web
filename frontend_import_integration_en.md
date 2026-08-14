# Frontend Integration Guide for Excel Report Import

This document explains how to integrate the newly added **Excel Import** functionality for Reports on the frontend.

---

## 1. Core Architecture (How does it work?)

The most important thing to know: for safety reasons and to preserve existing complex logic, **the Backend does NOT save the Excel data directly into the Database (DB).** The Backend only reads the file and returns a structured JSON payload for you to use.

**The Full Flow:**
1. The user downloads an empty template or selects their own existing Excel file.
2. The Frontend sends this file to the Backend's new `/import-parse/` endpoint.
3. The Backend reads the file and returns a JSON payload showing which UUID column should contain which value.
4. **You (Frontend):** Take this JSON and populate the form inputs on the user interface (UI) as if the user had typed them manually.
5. The user verifies that all numbers are correctly filled in and clicks the **"Save / Submit"** button.
6. You send the populated data to our standard (existing) `/api/v1/reports/create/` API just as you normally would. All percentages, totals, and `individual_report` logic will calculate automatically!

---

## 2. New Endpoints

You can find these APIs under the **Import-Excel** tag in Swagger.

### 2.1 Download Template (Optional, but recommended for UX)
You can provide an empty template so it's easier for the user to fill out.

- **Endpoint:** `GET /api/v1/reports/import-template/`
- **Query Parameters:**
  - `statement_id` (UUID, required) - The target table (Statement) ID
  - `lang` (uz/ru, optional, default: uz)
- **Response:** Downloads an `.xlsx` file directly via the browser. (You can add a "Download Template" button in the UI).

### 2.2 Import / Parse File (Main Endpoint)
The API used to read the file selected by the user.

- **Endpoint:** `POST /api/v1/reports/import-parse/`
- **Content-Type:** `multipart/form-data`
- **Body parameters:**
  - `file` (File) — The selected `.xlsx` file
  - `statement_id` (UUID) — The ID of the Statement (table) currently being filled
  - `sheet_name` (String, optional) — If the Excel has multiple sheets, which sheet to read from. If left empty, it reads the first active sheet by default.
  - `lang` (uz/ru, optional)

---

## 3. JSON Response Format (Payload)

If the Backend successfully parses the file, it returns an HTTP 200 response. There are two scenarios depending on the report type (Flat Report or Plant-based Report).

### A) Response for Flat Reports (Standard Tables):
When the table is a standard grid without specific plant objects.

```json
{
  "status": "success",
  "items": [
    {
      "column": "62869663-0821-4712-bec0-19ac54e2a119", 
      "value": "225.0"
    },
    {
      "column": "5deadd7a-095e-4872-878c-e13b29c3c86f",
      "value": "120"
    }
  ],
  "warnings": [],
  "errors": []
}
```
**Frontend Task:** Iterate through the `items` array and map the `value` into your form state where the input matches the `statement_column` UUID.

### B) Response for Plant-based Reports (Multi-row per Object):
When the table has multiple rows for different objects like "Ko'chat va nihol sotish", "Shaftoli" etc.

```json
{
  "status": "success",
  "plants": [
    {
      "plant": "uuid-for-shaftoli",
      "plant_name": "Shaftoli",
      "items": [
        {
          "column": "column-uuid",
          "value": "500"
        }
      ]
    },
    {
      "plant": "uuid-for-olma",
      "plant_name": "Olma",
      "items": [
        ...
      ]
    }
  ],
  "warnings": [],
  "errors": []
}
```
**Frontend Task:** This time, a `plants` array is returned. Find the corresponding plant row in your form state (using the `plant` UUID), and populate its columns using the nested `items` array.

---

## 4. Errors & Warnings

- **`errors` (List):** If there are parsing errors in the file (e.g., text written in a number-only cell), a detailed message with the exact row and column will be returned in the `errors` array. You can display these as a red `Alert` banner at the top of the form.
- **`warnings` (List):** Non-critical informational messages (e.g., "Hidden UUIDs not found, falling back to title matching"). You can display these using a subtle yellow `Toast` notification.

## Summary

Your main task: Send the file to the `import-parse` API, and map the returned array values into your Vue/React form state. Once mapped, the inputs will autofill, and the user can submit the form using the existing flow. Good luck! 🚀
