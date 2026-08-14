# Reja (Plan) — Excel Import / Export | Frontend qo'llanma

Bu hujjat **reja shabloni yuklab olish**, **reja import qilish** va **reja export qilish**
uchun frontend tomonда nimalar qilish kerakligini tushuntiradi.

Barcha endpoint'lar **bitta prefix** ostida:

```
/api/v1/reports/
```

---

## 0. Umumiy qoidalar

### Ruxsat (juda muhim)
Uchala endpoint ham **faqat `bolim_admin`** roli uchun ishlaydi va foydalanuvchi
**faqat o'z bo'limiga** tegishli statement/reja bilan ishlay oladi.

- Token bo'lmasa yoki rol boshqa bo'lsa → **403 Forbidden**
- Boshqa bo'lim statement/rejasi so'ralsa → **403** (`{"detail": "... sizning bo'limingizga tegishli emas."}`)

Shu sababli UI'da import/export tugmalarini **faqat `bolim_admin`** uchun ko'rsating.

### Har bir so'rovda header
```
Authorization: Bearer <access_token>
```

### Ikki xil statement turi
Statement'lar ikki xil bo'ladi (backend avtomatik hal qiladi, frontend hech narsa hisoblamaydi):

| Tur | Qanday | Misol |
|-----|--------|-------|
| **Oddiy** (`use_plant_plan=false`) | Bitta qatorga qiymatlar | Ko'p statementlar |
| **Plant-based** (`use_plant_plan=true`) | Har o'simlik/manba uchun alohida qator | **Daromad** |

Frontend uchun oqim **ikkalasida ham bir xil**: shablonni yuklab ol → to'ldir → import qil.
Farqni faqat Excel ichidagi qatorlar soni bildiradi.

---

## 1. Shablon yuklab olish (Template)

Foydalanuvchiga **bo'sh** Excel shablon beradi — u to'ldirib, keyin import qiladi.

```
GET /api/v1/reports/plan-excel/template/?statement=<uuid>&lang=uz
```

| Param | Joyi | Majburiy | Izoh |
|-------|------|----------|------|
| `statement` | query | ✅ | Qaysi bo'lim (Statement) uchun shablon |
| `lang` | query | ❌ | `uz` (default) yoki `ru` |

**Javob:** `.xlsx` fayl (`Content-Disposition: attachment`).

### Excel ichida nima bor
- **1-qator** — ustun sarlavhalari (masalan `1-chorak - Yanvar - Reja`)
- **2-qator** — YASHIRIN (ustun ID'lari). ⚠️ **Foydalanuvchi buni o'chirmasin/o'zgartirmasin** — import shu qatorga qarab ishlaydi.
- **3-qatordan** — to'ldiriladigan bo'sh kataklar.
  - Oddiy statement: 1 ta qator.
  - Plant-based: har o'simlik/manba uchun alohida qator (A ustun = o'simlik ID, o'zgartirmang; B = nomi).

### Frontend misol (axios)
```js
async function downloadTemplate(statementId, lang = "uz") {
  const res = await axios.get("/api/v1/reports/plan-excel/template/", {
    params: { statement: statementId, lang },
    responseType: "blob",
  });
  triggerDownload(res); // pastda
}
```

---

## 2. Reja import qilish (Import)

To'ldirilgan shablonni yuklaydi. Reja **bo'lmasa yaratiladi**, **bo'lsa yangilanadi**.

```
POST /api/v1/reports/plan-excel/import/?organization=<uuid>&statement=<uuid>&year=2026&season=spring
```

| Param | Joyi | Majburiy | Izoh |
|-------|------|----------|------|
| `organization` | query | ✅ | Reja qaysi tashkilotга |
| `statement` | query | ✅ | Qaysi bo'lim (Statement) |
| `year` | query | ✅ | Yil, masalan `2026` |
| `season` | query | ❌ | `spring` yoki `autumn` (ba'zi statementlarda kerak emas) |
| `file` | **body (multipart/form-data)** | ✅ | To'ldirilgan `.xlsx` |

⚠️ `file` — bu **query emas**, `multipart/form-data` body ichida `file` nomli maydon.

### Javob
- **201 Created** — yangi reja yaratildi
- **200 OK** — mavjud reja yangilandi
- Body: reja to'liq ma'lumoti (PlanSerializer — `id`, `organization`, `statement`, `year`, `season`, `plan_items` yoki `plant_plans`).

Backend chorak/yillik/jami'ni **avtomatik hisoblaydi** — frontend faqat oylik qiymatlarni yuboradi (ular shablonда bor).

### Frontend misol (axios)
```js
async function importPlan({ file, organization, statement, year, season }) {
  const form = new FormData();
  form.append("file", file); // <input type="file"> dan olingan File obyekti

  const res = await axios.post("/api/v1/reports/plan-excel/import/", form, {
    params: { organization, statement, year, season }, // season'ni faqat kerak bo'lsa
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // yaratilgan/yangilangan reja
}
```

---

## 3. Reja export qilish (Export)

Yaratilgan rejani **to'ldirilgan** Excel qilib beradi (o'qish/chop etish uchun).

```
GET /api/v1/reports/plan-excel/export/?plan=<uuid>&lang=uz
```

| Param | Joyi | Majburiy | Izoh |
|-------|------|----------|------|
| `plan` | query | ✅ | Reja (Plan) ID'si |
| `lang` | query | ❌ | `uz` (default) yoki `ru` |

`plan` ID'sini **reja ro'yxati** endpoint'idan olasiz:
```
GET /api/v1/reports/plan-list/
```
(bolim_admin uchun avtomatik faqat o'z rejalari qaytadi).

### Excel ichida nima bor
To'liq breakdown: kiritilgan **oylik** qiymatlar + hisoblangan **chorak / yillik / jami**.
Plant-based rejada har o'simlik/manba alohida qator.

### Frontend misol (axios)
```js
async function exportPlan(planId, lang = "uz") {
  const res = await axios.get("/api/v1/reports/plan-excel/export/", {
    params: { plan: planId, lang },
    responseType: "blob",
  });
  triggerDownload(res);
}
```

---

## 4. Fayl yuklab olish helper (template & export uchun)

`blob` javobni faylga aylantirib, brauzerда yuklab olish:

```js
function triggerDownload(res) {
  // fayl nomini Content-Disposition'dan olamiz
  const cd = res.headers["content-disposition"] || "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "plan.xlsx";

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
```

> Eslatma: `responseType: "blob"` **majburiy** — bo'lmasa fayl buziladi.

---

## 5. To'liq UI oqimi

```
[Bo'lim admin]
   │
   ├── 1. Statement tanlaydi (o'z bo'limiga tegishli)
   │
   ├── 2. "Shablon yuklab olish" tugmasi
   │        GET /plan-excel/template/?statement=...
   │        → bo'sh .xlsx yuklanadi
   │
   ├── 3. Excelni to'ldiradi (2-qatorni o'chirmasdan)
   │
   ├── 4. Tashkilot + yil (+ mavsum) tanlaydi, faylni tanlaydi
   │        "Import" tugmasi
   │        POST /plan-excel/import/?organization=&statement=&year=&season= + file
   │        → 201/200, reja yaratildi/yangilandi
   │
   └── 5. Reja ro'yxatidan ("Export" tugmasi)
            GET /plan-excel/export/?plan=<id>
            → to'ldirilgan .xlsx yuklanadi
```

---

## 6. Xatoliklar (error handling)

| HTTP | Sabab | UI'da nima ko'rsatish |
|------|-------|------------------------|
| **400** | Majburiy param yo'q / fayl formati noto'g'ri / bo'sh fayl | Backend `detail`/maydon xabarini ko'rsating |
| **403** | Rol `bolim_admin` emas YOKI boshqa bo'lim statement/rejasi | "Sizga ruxsat yo'q / bu sizning bo'limingizga tegishli emas" |
| **404** | Statement yoki Plan topilmadi | "Topilmadi" |
| **201 / 200** | ✅ Muvaffaqiyat (yaratildi / yangilandi) | Success toast + reja ro'yxatini yangilash |

Import xato javob misollari (400):
```json
{ "file": "This field is required." }
```
```json
{ "detail": "Shablon noto'g'ri: ustun ID'lari topilmadi. ... tizimdan yuklab olingan shablondan foydalaning." }
```
```json
{ "detail": "Faylda hech qanday qiymat topilmadi." }
```

---

## 7. Muhim eslatmalar

1. **2-qatorni o'chirmaslik** — shablondagi yashirin 2-qator (ustun ID'lari) import uchun kalit. Foydalanuvchiga ogohlantirish ko'rsating.
2. **Faqat tizim shablonini ishlatish** — foydalanuvchi o'zi yasagan Excel import bo'lmaydi (ID qatori yo'q → 400).
3. **Import = upsert** — bir xil (organization, statement, year, season) uchun qayta import qilinsa, eski qiymatlar yangilanadi (dublikat yaratilmaydi).
4. **Hisoblash backendда** — frontend chorak/yillik/jami hisoblamaydi, faqat oylik (shablondagi) kataklarni yuboradi.
5. **`use_plant_plan` farqi shaffof** — frontend alohida logika yozmaydi; shablon nechta qator kerakligini o'zi ko'rsatadi.

---

## 8. Qisqacha jadval (cheat sheet)

| Amal | Method | URL | Kerakli param | Javob |
|------|--------|-----|---------------|-------|
| Shablon | `GET` | `/api/v1/reports/plan-excel/template/` | `statement` (+`lang`) | `.xlsx` (bo'sh) |
| Import | `POST` | `/api/v1/reports/plan-excel/import/` | `organization`, `statement`, `year` (+`season`) + body `file` | 201/200 + reja |
| Export | `GET` | `/api/v1/reports/plan-excel/export/` | `plan` (+`lang`) | `.xlsx` (to'ldirilgan) |
| Reja ro'yxati | `GET` | `/api/v1/reports/plan-list/` | — | rejalar (plan `id` olish uchun) |

Barchasi faqat **`bolim_admin`** + **o'z bo'limi** uchun.
