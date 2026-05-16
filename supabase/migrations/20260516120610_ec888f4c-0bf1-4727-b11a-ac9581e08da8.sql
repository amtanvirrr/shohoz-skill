CREATE OR REPLACE FUNCTION public.__export_auth_users()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT jsonb_build_object(
    'users', COALESCE((SELECT jsonb_agg(to_jsonb(u.*)) FROM auth.users u), '[]'::jsonb),
    'identities', COALESCE((SELECT jsonb_agg(to_jsonb(i.*)) FROM auth.identities i), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.__export_auth_users() FROM PUBLIC, anon, authenticated;