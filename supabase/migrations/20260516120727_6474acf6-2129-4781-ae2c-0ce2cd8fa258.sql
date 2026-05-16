CREATE OR REPLACE FUNCTION public.__sign_storage(_bucket text, _path text, _expires int DEFAULT 3600)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, extensions
AS $$
DECLARE
  v_url text;
BEGIN
  -- Mint a signed URL using storage internals. Available in Supabase as storage.sign_url or via http.
  SELECT extensions.url_encode(
    extensions.sign(
      json_build_object('url', '/object/' || _bucket || '/' || _path, 'iat', extract(epoch from now())::int, 'exp', extract(epoch from now())::int + _expires)::text,
      current_setting('app.settings.jwt_secret', true)
    )
  ) INTO v_url;
  RETURN v_url;
END;
$$;

REVOKE ALL ON FUNCTION public.__sign_storage(text, text, int) FROM PUBLIC, anon, authenticated;