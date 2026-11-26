-- =====================================================================
-- FIX: trigger handle_new_user memaksa store_id=1 yang belum tentu ada.
-- Ubah agar store_id dibiarkan NULL — create_admin() yang mengisi.
-- Jalankan sekali di Supabase SQL Editor.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, store_id)
  VALUES (NEW.id, NEW.email, 'admin', NULL);
  RETURN NEW;
END;
$$;
