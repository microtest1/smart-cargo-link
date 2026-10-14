# China warehouse updates — prepared for review (not applied, not deployed)

## Included
- `migration.sql` — additive schema: customer code/email/invoice no. on `new_client_sms`, `warehouse_goods_photos`, `warehouse_notification_attempts` (per-channel status history).
- `goods-photo-access/` — customer photo viewer function (sign-in + ownership check, streams bytes, audit log).
- Live in app already: `/goods-photos/:recordId` customer page (sign-in required) and `src/lib/warehouseMessages.ts` (rebuilds SMS/WhatsApp/email text from the latest saved record; SMS includes the sign-in photo link).

## Still to build after approval
1. Create PRIVATE bucket `warehouse-goods-photos` (5MB, JPG/PNG).
2. `warehouse-goods-save` function: verify company session, update the SAME record by id, upload/remove photos, audit each change.
3. `warehouse-goods-notify` function: load latest record, build each channel message, send each channel independently, write one attempt row per channel. Real sends gated behind `WAREHOUSE_NOTIFY_LIVE=true`; otherwise record `dry_run`/`unconfigured` — never "sent".
4. Rework `/company-admin/china-warehouse-updates` (same layout): code lookup, single phone/WhatsApp field, hidden email, invoice no., photos with preview/remove, channel checkboxes (default on), per-channel preview, Edit / Save / Save & resend / retry failed channel.

## Blockers
- WhatsApp sending: no WhatsApp Business connection in the workspace.
- Email attachments: Resend key exists but sending domain not verified here.
- Homepage hero image and Shipping Rates & Terms PDF not supplied.
