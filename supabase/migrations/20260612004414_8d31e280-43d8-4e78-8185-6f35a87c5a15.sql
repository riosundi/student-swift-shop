
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
