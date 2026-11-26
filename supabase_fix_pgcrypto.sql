-- =====================================================================
-- FIX: gen_salt/crypt tidak ditemukan (pgcrypto di schema extensions)
-- Jalankan sekali di Supabase SQL Editor.
-- =====================================================================

-- Pastikan pgcrypto tersedia
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Perbaiki fungsi create_admin agar memakai schema extensions
CREATE OR REPLACE FUNCTION public.create_admin(p_email text, p_store_id bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated',
    lower(trim(p_email)),
    extensions.crypt('admin123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', lower(trim(p_email))),
    'email', new_user_id::text,
    now(), now(), now()
  );

  UPDATE public.profiles SET store_id = p_store_id WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;
