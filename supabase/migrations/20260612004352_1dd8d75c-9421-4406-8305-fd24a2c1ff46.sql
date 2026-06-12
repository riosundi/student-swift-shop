
CREATE TYPE public.app_role AS ENUM ('student', 'agent', 'business', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'purchased', 'delivering', 'delivered', 'completed', 'cancelled', 'disputed');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, phone TEXT, avatar_url TEXT, campus TEXT,
  id_document_url TEXT, id_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles self insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- WALLETS
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets self read" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  kind TEXT NOT NULL,
  order_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx self read" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- BUSINESSES
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, category TEXT,
  logo_url TEXT, location TEXT,
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses readable" ON public.businesses FOR SELECT TO authenticated USING (true);
CREATE POLICY "businesses owner all" ON public.businesses FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  image_url TEXT, stock INTEGER NOT NULL DEFAULT 0, category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products readable" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products owner all" ON public.products FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  items_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT, custom_request TEXT, receipt_url TEXT,
  delivered_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders policies (now that order_items exists)
CREATE POLICY "orders student read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "orders agent read" ON public.orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'agent') AND (status = 'pending' OR agent_id = auth.uid())
);
CREATE POLICY "orders business read" ON public.orders FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.businesses b ON b.id = p.business_id
    WHERE oi.order_id = orders.id AND b.owner_id = auth.uid()
  )
);
CREATE POLICY "orders student insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "orders student update" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "orders agent update" ON public.orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'agent') AND (agent_id = auth.uid() OR (status = 'pending' AND agent_id IS NULL))
);

-- order_items policies
CREATE POLICY "items read via order" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.student_id = auth.uid()
    OR o.agent_id = auth.uid()
    OR (public.has_role(auth.uid(),'agent') AND o.status = 'pending')
  ))
  OR EXISTS (
    SELECT 1 FROM public.products p JOIN public.businesses b ON b.id = p.business_id
    WHERE p.id = order_items.product_id AND b.owner_id = auth.uid()
  )
);
CREATE POLICY "items student insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.student_id = auth.uid())
);

-- Auto-create profile + wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
