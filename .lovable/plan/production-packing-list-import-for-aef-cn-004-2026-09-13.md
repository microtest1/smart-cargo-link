# Production Packing-List Import for AEF-CN-004

## Goal
Turn the uploaded workbook into a secure, persistent admin import workflow and import all 92 cargo rows into container `AEF-CN-004`. The workbook itself recalculates to **576 CTN, 72.95901 CBM, and 16,321.4044 KG**; these values will be treated as authoritative per the confirmed choice to include row 92.

## Build
1. **Safe import records**
   - Extend containers to store the internal AEF name separately from shipping container number, seal, type, origin, destination, and loading date.
   - Extend packing-list imports with filename, SHA-256 fingerprint, importer, validation counts, declared and calculated totals, confirmation state, and completion statistics.
   - Extend cargo rows with source row/date, receipt, original and normalized customer/phone values, courier reference, original row JSON, validation/match status, linked account, and shipment status.
   - Add SMS status/message/provider fields and immutable edit history.

2. **Validation and matching**
   - Parse XLSX only with the existing secure Excel library.
   - Preview all rows before confirmation with `VALID`, `MATCHED`, `UNMATCHED`, `NEEDS REVIEW`, `DUPLICATE`, and `MISSING CONTACT` states.
   - Normalize valid Ghana numbers without rewriting international numbers; preserve originals.
   - Match only by exact AEF code, unique normalized phone, or existing exact tracking linkage. Never assign by similar name alone.
   - Detect duplicate files, rows, receipt numbers, references, missing values, suspicious quantities, and name/phone variations.

3. **Atomic confirmation and production import**
   - Add a privileged transactional import operation so container, manifest, cargo lines, links, totals, and SMS queue records succeed or fail together.
   - Create `AEF-CN-004` once with shipping number `TGBU4543906`, seal `FJ28500932`, type `40HQ`, loading date `2026-09-10`, China → Ghana, status In Transit.
   - Preserve any later container status if the record already exists.
   - Import every valid workbook row once; ignore blank/total rows; create consolidated customer groups and internal shipment links.

4. **Privacy and account linking**
   - Enforce customer access by authenticated user/account link only; admins retain global access.
   - Remove any name-similarity ownership fallback and prevent public phone/code searches from returning private details.
   - Add automatic secure linking of unclaimed rows when a newly verified account has the unique normalized phone.

5. **Admin and customer experience**
   - Upgrade Packing Lists with preview, confirmation, completion report, import history, unmatched review, manifest, correction tools, audit history, SMS report, retry, and report export.
   - Upgrade Containers with the actual shipping number, seal/type/date, calculated totals, and an admin manifest link.
   - Show authenticated customers only their own cargo lines and calculated totals inside the container; retain delivery/invoice integration through existing container and shipment links.

6. **SMS and tracking integration**
   - Queue one consolidated SMS per valid unique customer, using the configured secure Hubtel integration.
   - Record pending/sent/failed/invalid/suppressed state, timestamp, safe provider reference, and retry count; never loop automatic retries.
   - Keep supplier courier tracking separate from internal AEF shipment tracking and make permitted identifiers searchable only within the viewer's authorization scope.

## Production validation
- Compare all 92 imported rows and recalculated totals against the workbook.
- Confirm no duplicate import, no total/blank row, safe matching, grouped customer totals, later account linkage, audit records, and persisted SMS states.
- Verify admin manifest/corrections and customer-private views on desktop and mobile.
- Verify public searches disclose no cargo details, existing containers remain unchanged, and current tracking, payments, invoices, delivery, and warehouse features still build and operate.
- Return the requested concise completion report with actual matched, unmatched, review, SMS, invalid-contact, and duplicate counts.
