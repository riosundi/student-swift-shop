
-- 1) profiles: self-read only
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 2) orders: restrict student update to safe columns + pending status
DROP POLICY IF EXISTS "orders student update" ON public.orders;
CREATE POLICY "orders student update" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND status = 'pending'::order_status)
  WITH CHECK (auth.uid() = student_id AND status = 'pending'::order_status);

-- Column-level grants: students may only update delivery_notes & delivery_address
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.orders TO authenticated;
GRANT UPDATE (delivery_notes, delivery_address) ON public.orders TO authenticated;
-- Agents need to update agent_id, status, delivered_at, completed_at, receipt_url
-- They use the existing 'orders agent update' policy via authenticated role too, so
-- grant those specific columns as well.
GRANT UPDATE (agent_id, status, delivered_at, completed_at, receipt_url) ON public.orders TO authenticated;
-- Service role retains full
GRANT ALL ON public.orders TO service_role;

-- 3) user_roles: prevent self-escalation to admin, and only allow first role
DROP POLICY IF EXISTS "roles self insert" ON public.user_roles;
CREATE POLICY "roles self insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role <> 'admin'::app_role
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- 4) Revoke EXECUTE on SECURITY DEFINER helper functions from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
