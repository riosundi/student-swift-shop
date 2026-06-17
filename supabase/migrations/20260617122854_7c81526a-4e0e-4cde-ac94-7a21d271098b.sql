
-- Demo auth users (idempotent via fixed UUIDs)
DO $$
DECLARE
  u_biz1 uuid := '11111111-1111-1111-1111-111111111101';
  u_biz2 uuid := '11111111-1111-1111-1111-111111111102';
  u_biz3 uuid := '11111111-1111-1111-1111-111111111103';
  u_stu  uuid := '11111111-1111-1111-1111-111111111201';
  b1 uuid := '22222222-2222-2222-2222-222222222201';
  b2 uuid := '22222222-2222-2222-2222-222222222202';
  b3 uuid := '22222222-2222-2222-2222-222222222203';
BEGIN
  -- Insert demo users into auth.users
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (u_biz1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-cafe@tileta.test',    '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Campus Bites Owner"}'::jsonb, now(), now()),
    (u_biz2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-mart@tileta.test',    '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"UNZA Mart Owner"}'::jsonb, now(), now()),
    (u_biz3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-print@tileta.test',   '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Zed Print Owner"}'::jsonb, now(), now()),
    (u_stu,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-student@tileta.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Demo Student"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Profiles + wallets (handle_new_user trigger not attached, do it manually)
  INSERT INTO public.profiles (id, full_name, campus) VALUES
    (u_biz1, 'Campus Bites Owner', 'UNZA Great East'),
    (u_biz2, 'UNZA Mart Owner',    'UNZA Great East'),
    (u_biz3, 'Zed Print Owner',    'UNZA Great East'),
    (u_stu,  'Demo Student',       'UNZA Great East')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance) VALUES
    (u_biz1, 0), (u_biz2, 0), (u_biz3, 0), (u_stu, 500)
  ON CONFLICT (user_id) DO NOTHING;

  -- Roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (u_biz1, 'business'), (u_biz2, 'business'), (u_biz3, 'business'),
    (u_stu, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Businesses
  INSERT INTO public.businesses (id, owner_id, name, description, category, location, subscription_active) VALUES
    (b1, u_biz1, 'Campus Bites Cafeteria', 'Hot meals, snacks and drinks delivered around campus.', 'Food', 'UNZA Great East Road Campus', true),
    (b2, u_biz2, 'UNZA Mini Mart',         'Groceries, toiletries and everyday essentials.',        'Groceries', 'Goma Lakes, UNZA', true),
    (b3, u_biz3, 'Zed Print & Stationery', 'Printing, photocopies, binding and stationery.',        'Stationery', 'Off Great East Road', true)
  ON CONFLICT (id) DO NOTHING;

  -- Products (Kwacha)
  INSERT INTO public.products (business_id, name, description, price, category, stock, image_url) VALUES
    (b1, 'Nshima with Beef Stew',  'Plate of nshima served with beef stew and rape.', 65.00, 'Meals',    50, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600'),
    (b1, 'Chicken & Chips',        'Quarter chicken with hot chips.',                  55.00, 'Meals',    50, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600'),
    (b1, 'Beef Samosa (2pc)',      'Crispy fried samosas, beef filling.',              15.00, 'Snacks',  100, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600'),
    (b1, 'Coca-Cola 500ml',        'Chilled soft drink.',                              12.00, 'Drinks',  200, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600'),
    (b2, 'Mealie Meal 25kg',       'Roller meal, premium grade.',                     320.00, 'Groceries', 30, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600'),
    (b2, 'Cooking Oil 2L',         'Sunflower cooking oil.',                          110.00, 'Groceries', 40, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600'),
    (b2, 'Sugar 2kg',              'White granulated sugar.',                          75.00, 'Groceries', 60, 'https://images.unsplash.com/photo-1581600140682-d4e68c8e3d9a?w=600'),
    (b2, 'Bath Soap (4pk)',        'Bathing soap, assorted scents.',                   45.00, 'Toiletries', 80, 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600'),
    (b3, 'Black & White Print (per page)', 'A4 single side print.',                     1.50, 'Printing', 9999, 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600'),
    (b3, 'Color Print (per page)', 'A4 single side color print.',                       5.00, 'Printing', 9999, 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600'),
    (b3, 'Spiral Binding',         'Up to 200 pages.',                                 35.00, 'Binding',   500, 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600'),
    (b3, 'Exam Pad (A4)',          '80-page ruled writing pad.',                       25.00, 'Stationery', 200, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600');
END $$;

-- Sample orders for the demo student
DO $$
DECLARE
  u_stu uuid := '11111111-1111-1111-1111-111111111201';
  o1 uuid := '33333333-3333-3333-3333-333333333301';
  o2 uuid := '33333333-3333-3333-3333-333333333302';
  p_meal uuid;
  p_drink uuid;
  p_print uuid;
BEGIN
  SELECT id INTO p_meal  FROM public.products WHERE name = 'Nshima with Beef Stew' LIMIT 1;
  SELECT id INTO p_drink FROM public.products WHERE name = 'Coca-Cola 500ml' LIMIT 1;
  SELECT id INTO p_print FROM public.products WHERE name = 'Black & White Print (per page)' LIMIT 1;

  INSERT INTO public.orders (id, student_id, status, items_total, delivery_fee, service_charge, total, commission, delivery_address, delivery_notes)
  VALUES
    (o1, u_stu, 'pending',   77.00, 15.00, 5.00, 97.00, 5.00, 'Africa Hostel Room 214', 'Call on arrival'),
    (o2, u_stu, 'delivered', 50.00, 12.00, 4.00, 66.00, 4.00, 'November Hostel Room 18', 'Leave at reception')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price) VALUES
    (o1, p_meal,  'Nshima with Beef Stew',          1, 65.00),
    (o1, p_drink, 'Coca-Cola 500ml',                1, 12.00),
    (o2, p_print, 'Black & White Print (per page)', 20, 1.50),
    (o2, p_drink, 'Coca-Cola 500ml',                1, 12.00)
  ON CONFLICT DO NOTHING;
END $$;
