# Smart SKU Generation - Your Product Analysis

## Format: `CAT-BRD-VAR-SZ`

**When you import your CSV**, each product will automatically receive a smart SKU based on this analysis:

### Sample Generated SKUs from Your CSV

| Product Name | Generated SKU | Category | Brand | Variant | Size |
|---|---|---|---|---|---|
| STRIPED TRASH BIN BLK 377 | `HOM-TSH-STR-377` | Home | Trash | Striped | 377 |
| DEGER BC BROOM | `HOM-DGR-BRM-PCK` | Home | Deger | Broom | Pack |
| 907 H DSTPAN BIG BLK | `HOM-907-BLK-001` | Home | 907 | Black | 001 |
| CLOVER CHIPS CHEESE 24G | `FDS-CLV-CHZ-24` | Food/Snacks | Clover | Cheese | 24 |
| OISHI FISHDA FISH KRPK 22G | `FDS-OIS-KRP-22` | Food/Snacks | Oishi | Crispy | 22 |
| MANG JUAN SKAT SILI 26G | `FDS-MJN-SPI-26` | Food/Snacks | Mang Juan | Spicy | 26 |
| NESCAFE GOLD MED ROAST 2G | `FDB-NES-GLD-002` | Food/Bev | Nescafe | Gold | 002 |
| 555 SARDINES GREEN 100/155G | `FDC-555-GRN-155` | Food/Canned | 555 | Green | 155 |
| ARIEL CMP FLORAL PASSION | `HOM-ARL-FLO-001` | Home | Ariel | Floral | 001 |
| COLGATE TP GREAT REGULAR | `PCC-CGT-REG-001` | Personal/Oral | Colgate | Regular | 001 |
| SILKA PAPAYA WHITENING | `PCS-SLK-PAP-001` | Personal/Soap | Silka | Papaya | 001 |
| HEAD SHOULDER COOL MNTHL | `PCH-HED-COL-MNT` | Personal/Hair | Head | Cool | Mint |
| CREAM SILK ULTIMATE REBORN | `PCH-CMS-ULT-001` | Personal/Hair | Cream Silk | Ultimate | 001 |
| COLGATE TP FLAV | `PCC-CGT-001-001` | Personal/Oral | Colgate | 001 | 001 |
| NESCAFE CREAMYLATTE 240x20G | `FDB-NES-CRM-20` | Food/Bev | Nescafe | Creamy | 20 |

---

## Category Codes

| Code | Category | Examples |
|------|----------|----------|
| **HOM** | Home/Household | Trash bins, brooms, cleaning products |
| **FDS** | Food/Snacks | Chips, crackers, candy |
| **FDB** | Food/Beverages | Coffee, tea, juice, drinks |
| **FDC** | Food/Canned | Sardines, corned beef, loaf |
| **FDO** | Food/Other | Condiments, oil, sugar, noodles |
| **PCC** | Personal/Oral | Toothpaste, mouthwash |
| **PCH** | Personal/Hair | Shampoo, conditioner |
| **PCS** | Personal/Soap | Soap, bath products |
| **STA** | Stationery | Paper, pens, folders |

---

## How to Use

### When Adding Products Manually
1. Fill in **Product Name** (e.g., "CLOVER CHIPS CHEESE 24G")
2. Fill in **Unit** (e.g., "PCS") — optional but helps with size detection
3. Leave **SKU blank** — it will auto-generate
4. The form will show a **preview** of the generated SKU
5. You can override it by toggling "Override" and entering a custom SKU

### When Bulk Importing
1. Upload your CSV with **name, unit, price, stock** columns
2. If no **sku** column exists, each product gets an auto-generated SKU
3. If you include a **sku** column in the CSV, those values are used instead

---

## Benefits

✅ **Consistent & Searchable** — Find products by category (HOM-*, FDS-*, etc.)  
✅ **Human-Readable** — Anyone can understand what HOM-TSH-BLK-377 is  
✅ **No Data Loss** — Uses only product name, unit, and variant info you already have  
✅ **Future-Proof** — If you omit a field, the generator intelligently falls back  
✅ **Optional Customization** — Override any SKU manually if needed  
