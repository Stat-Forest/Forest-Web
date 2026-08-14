# `/reports/import-parse/` — ustun UUID lari noto'g'ri qaytmoqda

> Backend uchun topshiriq. Frontend tomoni tayyor va to'g'ri ishlayapti — muammo API javobida.

## 1. Kontekst: import qanday ishlaydi

Kelishilgan oqim (`frontend_import_integration_en.md` bo'yicha):

1. Foydalanuvchi Excel faylni tanlaydi.
2. Frontend `POST /api/v1/reports/import-parse/` ga `file` + `statement_id` yuboradi.
3. Backend faylni o'qib, `{column: <statement_column UUID>, value: <qiymat>}` ro'yxatini qaytaradi.
4. Frontend har bir `column` UUID bo'yicha forma inputini topib to'ldiradi.

Frontend formadagi ustunlarni **faqat** shu endpointdan oladi:

```
GET /api/v1/reports/statement-columns/?statement=<statement_id>&lang=uz&is_user_input=true
```

Demak `import-parse` qaytargan `column` UUID lari aynan shu ro'yxatdagi UUID lar bo'lishi shart. Aks holda frontend qiymatni hech qaysi inputga bog'lay olmaydi.

## 2. Muammo

Golofit hisobotida (`statement=6bdcc…`) `import-parse` javobidagi **4 ta UUID dan 2 tasi** hisobot ustunlari orasida yo'q.

Javob namunasi:

```json
{
  "status": "success",
  "items": [
    { "column": "56a344a0-105c-4fcc-9980-aaadf7755b49", "value": "buvayda" },
    { "column": "f4e63dec-ad5f-466b-acd4-4da9130d94e1", "value": "101.00" },
    { "column": "7927fa20-5ec3-40d8-8273-03509ab72124", "value": "1" },
    { "column": "4cb3f906-b783-4577-875e-f1aedddd5ef3", "value": "1.0" }
  ],
  "warnings": [
    { "row": null, "column_title": null, "message": "Yashirin UUID qatori topilmadi — sarlavha matniga qarab moslashtirish ishlatildi." }
  ],
  "errors": []
}
```

Holat:

| UUID | Qiymat | Frontendda |
|---|---|---|
| `f4e63dec-ad5f-466b-acd4-4da9130d94e1` | `101.00` | ✅ topildi — "Reja" ustuni |
| `7927fa20-5ec3-40d8-8273-03509ab72124` | `1` | ✅ topildi — "Amalda" ustuni |
| `56a344a0-105c-4fcc-9980-aaadf7755b49` | `buvayda` | ❌ **bunday ustun yo'q** |
| `4cb3f906-b783-4577-875e-f1aedddd5ef3` | `1.0` | ❌ **bunday ustun yo'q** |

Natijada "Tashkilot nomi" va "Tumanlar nomi" maydonlari bo'sh qoladi, garchi Excel'da qiymat bor bo'lsa ham (`buvayda` — tuman nomi).

## 3. Tekshiruv (frontend nima qildi)

Frontend noma'lum UUID kelganda zaxira yo'lni bajaradi:

1. `GET /reports/statement-columns/?statement=6bdcc…&lang=uz&is_user_input=true` — UUID topilmadi.
2. `GET /reports/statement-columns/?statement=6bdcc…&lang=uz` (filtrsiz, **barcha** ustunlar) — UUID yana topilmadi.

Ya'ni bu UUID lar shu `statement` ning ustunlari daraxtida umuman uchramaydi.

## 4. Kutilgan natija

`import-parse` javobidagi har bir `items[].column` (va `plants[].items[].column`) qiymati `statement_id` ga tegishli `StatementColumn` ning ID si bo'lishi kerak — `statement-columns` endpointi qaytaradigan aynan o'sha UUID.

Qabul mezoni:

```python
returned_ids = {item["column"] for item in response["items"]}
statement_ids = set(
    StatementColumn.objects.filter(statement_id=statement_id).values_list("id", flat=True)
)
assert returned_ids <= statement_ids
```

Bu tekshiruvni javob qaytarilishidan oldin qo'shish tavsiya etiladi: begona ID topilsa — uni `items` ga qo'shmasdan, `warnings` ga tushunarli xabar bilan yozish.

## 5. Ehtimoliy sabab

Javobdagi ogohlantirish: **"Yashirin UUID qatori topilmadi — sarlavha matniga qarab moslashtirish ishlatildi."**

Ya'ni foydalanuvchi o'z Excel faylini yuklagan, unda yashirin UUID qatori yo'q va backend ustunlarni sarlavha matni bo'yicha topgan. Shu fallback mantiqda ustun izlash, ehtimol, `statement` bo'yicha filtrlanmayapti — global (yoki boshqa hisobot ustunlari ichidan) qidiryapti va boshqa `statement` ga tegishli UUID ni qaytaryapti.

Tekshirish kerak: sarlavha bo'yicha moslashtirish query si `StatementColumn.objects.filter(statement=statement)` bilan cheklanganmi?

## 6. Qo'shimcha topilmalar

### 6.1. `warnings` / `errors` formati hujjatga mos emas

`frontend_import_integration_en.md` da ular satrlar ro'yxati deb yozilgan, amalda esa obyekt keladi:

```json
"warnings": [{ "row": null, "column_title": null, "message": "…" }]
```

Frontend endi ikkala formatni ham qo'llab-quvvatlaydi, lekin **yagona formatga kelishish** kerak. Taklif: hozirgi obyekt formatini rasmiylashtirib, hujjatni yangilash:

```json
{ "row": 5, "column_title": "Amalda", "message": "…" }
```

### 6.2. Qiymatlar noto'g'ri ustunga tushayotganga o'xshaydi

Sarlavha bo'yicha moslashtirish ishlaganda qiymatlar siljib ketyapti: tuman nomi (`buvayda`) tashkilot ustuniga o'xshash UUID ga, sonli `1.0` esa boshqa joyga tushgan. UUID muammosi tuzatilgach, moslashtirish tartibini ham tekshirish kerak.

### 6.3. `plan-items` 404

`GET /reports/plan-items/?organization=bc6c069b-e…&statement=6bdcc…&year=…&column=…` ba'zi muddatlar uchun **404** qaytaryapti. Reja ustuni shu sababli bo'sh qolyapti. Bu importdan alohida masala, lekin bir hisobot oqimida uchraydi — reja topilmasa `404` emas, bo'sh ro'yxat (`200 []`) qaytarish to'g'riroq bo'ladi.

## 7. Qanday sinash

1. Golofit hisoboti uchun `GET /reports/import-template/?statement=6bdcc…&lang=uz` orqali shablon oling.
2. Shablonni to'ldirib `import-parse` ga yuboring → yashirin UUID qatori bor, javob to'g'ri chiqishi kerak (bu holat hozir ham ishlaydi).
3. Endi o'sha faylning **yashirin UUID qatorini o'chirib** yuboring → sarlavha bo'yicha fallback ishga tushadi. Aynan shu holatda javobdagi barcha `column` ID lar `statement-columns` dagi ID lar bilan bir xil bo'lishi kerak.
