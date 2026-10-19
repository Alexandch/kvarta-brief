CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  phone text NOT NULL,
  phone_digits text NOT NULL,
  interest text NOT NULL,
  comment text NOT NULL DEFAULT '',
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS leads_phone_recent_idx
  ON public.leads (phone_digits, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_kvarta_lead(
  p_name text,
  p_phone text,
  p_phone_digits text,
  p_interest text,
  p_comment text,
  p_attribution jsonb
)
RETURNS TABLE (lead_id uuid, created_at timestamptz, duplicate boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  new_lead_id uuid;
  new_created_at timestamptz;
BEGIN
  -- Serialize requests for the same phone while allowing other visitors through.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_phone_digits, 0));

  IF EXISTS (
    SELECT 1
    FROM public.leads AS existing
    WHERE existing.phone_digits = p_phone_digits
      AND existing.created_at > clock_timestamp() - interval '10 minutes'
  ) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::timestamptz, true;
    RETURN;
  END IF;

  INSERT INTO public.leads AS inserted_lead (created_at, name, phone, phone_digits, interest, comment, attribution)
  VALUES (clock_timestamp(), p_name, p_phone, p_phone_digits, p_interest, p_comment, COALESCE(p_attribution, '{}'::jsonb))
  RETURNING inserted_lead.id, inserted_lead.created_at INTO new_lead_id, new_created_at;

  RETURN QUERY SELECT new_lead_id, new_created_at, false;
END;
$$;
