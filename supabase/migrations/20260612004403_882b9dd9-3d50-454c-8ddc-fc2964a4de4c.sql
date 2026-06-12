
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
ALTER FUNCTION public.update_updated_at_column() SECURITY INVOKER;
