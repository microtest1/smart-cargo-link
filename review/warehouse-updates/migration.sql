-- PREPARED FOR REVIEW — NOT APPLIED.
-- China warehouse updates: single editable goods record, private photos,
-- per-channel attempt history. Additive only (no drops, no type changes).
-- Also required (tool, not SQL): create PRIVATE bucket "warehouse-goods-photos", 5MB limit.

ALTER TABLE public.new_client_sms
  ADD COLUMN IF NOT EXISTS customer_user_code text,
  ADD COLUMN IF NOT EXISTS customer_user_id uuid,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS warehouse_invoice_number text,
  ADD COLUMN IF NOT EXISTS channels_requested text[] NOT NULL DEFAULT ARRAY['sms','whatsapp','email'];
COMMENT ON COLUMN public.new_client_sms.message_sent IS 'DEPRECATED for resend: messages are rebuilt from latest record values';

CREATE TABLE public.warehouse_goods_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.new_client_sms(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  uploaded_by text,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.warehouse_goods_photos(record_id) WHERE removed_at IS NULL;
GRANT SELECT ON public.warehouse_goods_photos TO authenticated;
GRANT ALL ON public.warehouse_goods_photos TO service_role;
ALTER TABLE public.warehouse_goods_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read goods photos" ON public.warehouse_goods_photos
  FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid()));
-- Customers never read this table directly; the goods-photo-access function checks ownership.

CREATE TABLE public.warehouse_notification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.new_client_sms(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp','email')),
  status text NOT NULL CHECK (status IN ('sent','failed','unconfigured','dry_run','skipped')),
  error text,
  provider_message_id text,
  message_body text NOT NULL,
  attempted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.warehouse_notification_attempts(record_id, channel, created_at DESC);
GRANT SELECT ON public.warehouse_notification_attempts TO authenticated;
GRANT ALL ON public.warehouse_notification_attempts TO service_role;
ALTER TABLE public.warehouse_notification_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification attempts" ON public.warehouse_notification_attempts
  FOR SELECT TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- Storage: no public access. Only service role (edge functions) reads/writes.
-- (No storage.objects policies for anon/authenticated on this bucket = locked.)
