# Production-wide Sea and Vehicle Warehouse Update

## Outcome
Replace every obsolete sea-freight and car/vehicle warehouse reference with the exact official address below, while preserving the unrelated air-freight and repacking warehouse information:

`AEF佛山市南海区里水镇科冠路3号6号楼101仓立特仓，入仓号立特16624728819`

## Implementation

### 1. Centralize the official warehouse information
- Make the existing warehouse content module the single source for the official sea-freight and car/vehicle address, labels, required fields, notices, and copy templates.
- Replace the former general/sea entry with a dedicated **Sea Freight** entry.
- Replace the old vehicle address, telephone number, and routing code with the new official vehicle information.
- Keep the current air-freight and repacking records unchanged.
- Remove all remaining direct copies of the old sea and vehicle addresses from application code and generated instructions.

### 2. Rebuild the shared warehouse display
- Update the reusable warehouse finder used by the public website, customer dashboard, cargo page, and tracking page.
- Provide clear **Sea Freight** and **Car / Vehicle Shipping** choices, exact Chinese address text, emphasized AEF Code / Shipping Mark, customer details, required guidance, and a prominent **Copy Warehouse Details** action.
- Copy a supplier-ready English/Chinese instruction block and show “Warehouse details copied successfully.”
- For signed-out visitors, show safe placeholders plus Create Account and Sign In actions; never expose customer information.
- For signed-in customers, populate name, phone, AEF code, and default Ghana delivery location from their account.
- Require Chassis/VIN/Serial Number, Model, and Year before copying vehicle instructions.

### 3. Customer dashboard integration
- Rename the dashboard section to **China Warehouse Address** and pass the customer’s account information into the shared display.
- Use the saved default Ghana delivery location when available, with a neutral placeholder when none exists.
- Clarify throughout the customer area that the existing unique AEF code is the official shipping mark; no new identifier will be introduced.

### 4. Store and manage vehicle shipment details
- Extend shipment records with shipment service type, chassis/VIN/serial number, vehicle model, and vehicle year fields.
- Preserve every existing shipment by keeping the new fields compatible with historical records; require vehicle fields in all new or edited vehicle records.
- Update both the main Admin shipment form/table and Company Admin shipment form/cards so sea and vehicle records show customer identity, AEF shipping mark, phone, Ghana destination, cargo, tracking, status, and vehicle details where applicable.
- Keep existing customer linking, tracking-number generation, notifications, containers, invoices, CBM, and delivery behavior intact.

### 5. Database-driven content cleanup
- Update the current company China warehouse value to the new official address.
- Search address-bearing database content for exact obsolete sea/vehicle addresses and associated obsolete phone/code values, replacing only matching legacy warehouse data.
- Do not alter unrelated warehouse, air-freight, repacking, customer, cargo, or historical shipment data.

## Technical details
- Apply one additive database migration to `shipments` for `service_type`, `vehicle_identifier`, `vehicle_model`, and `vehicle_year`, including safe validation for vehicle records.
- Update generated database types through the migration workflow before changing shipment forms.
- Use the existing profile and delivery-location access rules; no public customer data queries will be added.
- Keep warehouse address constants in `src/content/warehouses.ts`; all shared display and copy formatting will consume that source.

## Validation
- Search the full repository and relevant database text fields for the two old addresses, old vehicle code, and associated obsolete phone numbers; confirm zero conflicting matches.
- Verify public signed-out placeholders and account actions.
- Verify an authenticated customer sees their own AEF code, name, phone, and saved Ghana location only.
- Verify sea and vehicle copy output, including required vehicle-field validation.
- Create/edit/read a test vehicle shipment through the admin-compatible data path and confirm all new fields round-trip.
- Check Admin and Company Admin shipment displays.
- Test desktop and mobile layouts in the public warehouse page and customer dashboard.
- Confirm the preview builds cleanly and existing tracking, cargo/container, invoice, and delivery screens still load.
