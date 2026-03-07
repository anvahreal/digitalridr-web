ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS host_logo text;
NOTIFY pgrst, 'reload schema';
