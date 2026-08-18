# 📋 Import Excel — Frontend uchun backend o'zgarishlar

> **Muallif:** Backend  
> **Sana:** 2026-08-18  
> **Tegishli endpointlar:**  
> - `GET /api/v1/reports/import-template/` — shablon yuklab olish  
> - `POST /api/v1/reports/import-parse/` — faylni parse qilish

---

## 1. UUID qatori ko'rinib qolish muammosi

### Muammo
Foydalanuvchi shablonni yuklab, to'ldirib qayta yuklaganida, jadvalda **UUID qatori ko'rinib qoladi** (masalan `b27fc67e-9169-4262-8961-006e8c99ce54` kabi qiymatlar sarlavha ostida ko'rinadi).

### Sabab
Backend shablonga yashirin UUID qatorini qo'shadi — bu qator Excel `hidden=true` va `height=0.1` bilan belgilangan. Lekin frontend **Excel preview** komponenti yashirin qatorlarni ham ko'rsatayapti.

### Frontend fix kerak
Excel faylni preview qilganda **yashirin qatorlarni filtrlash** kerak:

```javascript
// openpyxl/SheetJS dan o'qiganda:
// Excel row ning hidden xususiyatini tekshirish kerak

// SheetJS (xlsx) bilan misol:
const workbook = XLSX.read(data, { type: 'binary' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Row uchun hidden tekshiruv:
// sheet['!rows'] massivida har bir row uchun { hidden: true } bo'lishi mumkin
const rows = sheet['!rows'] || [];
rows.forEach((row, index) => {
  if (row && row.hidden) {
    // Bu qatorni ko'rsatmang — UUID qatori
  }
});
```

### UUID qatorini aniqlash qoidalari
UUID qatori quyidagi belgilar bilan aniqlanadi:
1. **`hidden = true`** — Excel row dimension
2. **`height ≈ 0`** — qator balandligi juda kichik (0.1px)
3. **Font rangi oq** (`#FFFFFF`) va **font o'lchami 1px** — ko'zga ko'rinmaydi
4. Qiymatlari UUID formatida: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36 belgi)

> **MUHIM:** UUID qatorini **o'chirib yubormaslik** kerak. Bu qator backend parse uchun muhim — har bir ustunni aniq bazadagi ustun bilan moslashtirish uchun ishlatiladi.

---

## 2. `import-parse` — Response formati o'zgardi (ko'p qatorli)

### Eski format (bitta qator)
Oldin faqat **birinchi qator** o'qilardi, qolganlari tashlanardi:

```json
{
  "status": "success",
  "is_plant_based": false,
  "items": [
    { "column": "uuid-1", "value": "10" },
    { "column": "uuid-2", "value": "20" }
  ],
  "warnings": [],
  "errors": []
}
```

### Yangi format (barcha qatorlar)
Endi **barcha qatorlar** qaytariladi. Har bir qator `rows` massivida guruhlangan va `items` massivida tekis holda:

```json
{
  "status": "success",
  "is_plant_based": false,
  "items": [
    { "column": "uuid-1", "value": "10", "row": 7, "organization": "Buvayda tumani" },
    { "column": "uuid-2", "value": "20", "row": 7, "organization": "Buvayda tumani" },
    { "column": "uuid-1", "value": "5",  "row": 8, "organization": "Rishton tumani" },
    { "column": "uuid-2", "value": "15", "row": 8, "organization": "Rishton tumani" },
    { "column": "uuid-1", "value": "8",  "row": 9, "organization": "" },
    { "column": "uuid-2", "value": "12", "row": 9, "organization": "" }
  ],
  "rows": [
    {
      "row": 7,
      "organization": "Buvayda tumani",
      "items": [
        { "column": "uuid-1", "value": "10" },
        { "column": "uuid-2", "value": "20" }
      ]
    },
    {
      "row": 8,
      "organization": "Rishton tumani",
      "items": [
        { "column": "uuid-1", "value": "5" },
        { "column": "uuid-2", "value": "15" }
      ]
    },
    {
      "row": 9,
      "organization": "",
      "items": [
        { "column": "uuid-1", "value": "8" },
        { "column": "uuid-2", "value": "12" }
      ]
    }
  ],
  "warnings": [],
  "errors": []
}
```

### Yangi maydonlar

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `items[].row` | `int` | Excel qator raqami (masalan 7, 8, 9...) |
| `items[].organization` | `string` | Shu qatordagi "Tashkilot nomi" ustun qiymati (bo'sh bo'lishi mumkin) |
| `rows` | `array` | Qator bo'yicha guruhlangan ma'lumotlar |
| `rows[].row` | `int` | Excel qator raqami |
| `rows[].organization` | `string` | Tashkilot nomi |
| `rows[].items` | `array` | Shu qatordagi ustun-qiymat juftliklari |

### Frontend qanday ishlatishi kerak

```javascript
// Misol: formni to'ldirish
const response = await fetch('/api/v1/reports/import-parse/', { ... });
const data = await response.json();

if (data.is_plant_based) {
  // O'simlikli jadval — avvalgidek `data.plants` dan foydalaning
  data.plants.forEach(plant => {
    // har bir o'simlik uchun qiymatlarni formga yozish
  });
} else {
  // Oddiy jadval — YANGI: `data.rows` dan foydalaning
  data.rows.forEach((rowEntry, index) => {
    // Har bir qator — alohida forma yoki jadval qatori
    const { row, organization, items } = rowEntry;
    
    items.forEach(item => {
      // item.column — ustun UUID
      // item.value — qiymat
      // Formadagi mos maydonga yozish
      setFieldValue(index, item.column, item.value);
    });
  });
}
```

> **OGOHLANTIRISH:** Endi `items` massivida **bir xil `column` UUID bir nechta marta** uchrashi mumkin (har bir qator uchun). Agar oldin `items` ni `{ [column]: value }` sifatida map qilayotgan bo'lsangiz — bu endi ishlamaydi. `rows` massividan foydalaning yoki `row` bo'yicha guruhlang.

---

## 3. `organization_id` va `year` endi ixtiyoriy (optional)

### Eski holat
```
POST /api/v1/reports/import-parse/
→ organization_id: REQUIRED
→ year: REQUIRED
```
**Muammo:** Frontend `organization_id` va `year` ni yubormagan — 400 xato chiqayotgan edi:
```json
{"organization_id": ["Обязательное поле."], "year": ["Обязательное поле."]}
```

### Yangi holat
```
POST /api/v1/reports/import-parse/
→ organization_id: OPTIONAL
→ year: OPTIONAL
```

**Agar berilmasa** — Reja (Plan) validatsiyasi **o'tkazib yuboriladi**, parse ishlaydi.  
**Agar berilsa** — Reja validatsiyasi avvalgidek ishlaydi (faylda Reja ustuniga qiymat bo'lsa, bazadagi tasdiqlangan Plan bilan solishtiriladi).

### Frontend uchun tavsiya
Agar frontend sahifada `organization_id` va `year` mavjud bo'lsa — yuborish **tavsiya etiladi** (Reja validatsiyasi ishlaydi). Lekin **majburiy emas**.

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('statement_id', statementId);

// Ixtiyoriy — mavjud bo'lsa qo'shing
if (organizationId) formData.append('organization_id', organizationId);
if (year) formData.append('year', year);

const response = await fetch('/api/v1/reports/import-parse/', {
  method: 'POST',
  body: formData,
});
```

---

## 4. Shablon tuzilmasi o'zgardi

### O'zgarishlar
| # | O'zgarish | Oldin | Keyin |
|---|-----------|-------|-------|
| 1 | **`№` ustuni olib tashlandi** | `№ \| Tashkilot nomi \| ...` | `Tashkilot nomi \| ...` |
| 2 | **Sarlavhalar ko'p qatorli** | Bitta qator (yassi) | Ko'p qator (merged cells) |
| 3 | **UUID qatori ko'rinmas** | Yashirin qator | Yashirin + oq font + 0.1px balandlik |
| 4 | **Plantlar oldindan to'ldirilmaydi** | Plant ID + nomi bor edi | Bo'sh — user o'zi yozadi |

### Shablon tuzilmasi
```
Row 1..N:  Ko'p qatorli sarlavhalar (merged cells)
Row N+1:   UUID qatori (YASHIRIN — ko'rsatmang!)
Row N+2+:  Foydalanuvchi ma'lumot kiritadigan qatorlar
```

---

## 5. Xulosa — nima qilish kerak

| # | Vazifa | Muhimlik |
|---|--------|----------|
| 1 | Excel preview da **yashirin qatorlarni filtrlash** (UUID ko'rinmasin) | 🔴 Yuqori |
| 2 | `import-parse` response dagi **`rows` massividan foydalanish** (ko'p qatorli ma'lumotni ko'rsatish) | 🔴 Yuqori |
| 3 | `organization_id` va `year` ni **mavjud bo'lsa yuborish**, bo'lmasa yubormaslik | 🟡 O'rta |
| 4 | Formada `№` ustunini olib tashlash (shablonda endi yo'q) | 🟢 Past |
