
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Staff Table
create table if not exists staff (
  id text primary key,
  name text not null,
  role text not null check (role in ('admin', 'employee')),
  commission numeric default 0,
  username text unique not null,
  password text,
  email text
);

-- 2. Services Table
create table if not exists services (
  id text primary key,
  name text not null,
  price numeric default 0,
  duration numeric default 30,
  category text
);

-- 3. Products Table
create table if not exists products (
  id text primary key,
  name text not null,
  price numeric default 0,
  cost numeric default 0,
  stock numeric default 0,
  barcode text
);

-- 4. Customers Table
create table if not exists customers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at text
);

-- 5. Sales Table
create table if not exists sales (
  id text primary key,
  timestamp text not null,
  items jsonb, -- Stores array of items: {id, name, price, type, quantity}
  staff_id text,
  customer_id text,
  total numeric default 0,
  tax numeric default 0,
  discount numeric default 0,
  discount_code text,
  payment_method text,
  tax_type text
);

-- 6. Expenses Table
create table if not exists expenses (
  id text primary key,
  date text not null,
  category text,
  amount numeric default 0,
  description text
);

-- 7. Settings Table (Stores config in a single JSONB row)
create table if not exists settings (
  id int primary key default 1,
  data jsonb
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Since this app uses a custom internal auth system (pin/password) 
-- and accesses Supabase via the public anon key, we enable public access.

alter table staff enable row level security;
create policy "Enable all access for staff" on staff for all using (true) with check (true);

alter table services enable row level security;
create policy "Enable all access for services" on services for all using (true) with check (true);

alter table products enable row level security;
create policy "Enable all access for products" on products for all using (true) with check (true);

alter table customers enable row level security;
create policy "Enable all access for customers" on customers for all using (true) with check (true);

alter table sales enable row level security;
create policy "Enable all access for sales" on sales for all using (true) with check (true);

alter table expenses enable row level security;
create policy "Enable all access for expenses" on expenses for all using (true) with check (true);

alter table settings enable row level security;
create policy "Enable all access for settings" on settings for all using (true) with check (true);

-- ==========================================
-- INITIAL DATA SEEDING (Optional)
-- ==========================================

-- Default Settings
insert into settings (id, data) 
values (1, '{"shopName": "TrimTime Barber", "currency": "$", "language": "en", "taxRate": 8, "taxType": "excluded", "whatsappEnabled": true}'::jsonb)
on conflict (id) do nothing;

-- Initial Staff
insert into staff (id, name, role, commission, username, password, email) values
('st1', 'Admin User', 'admin', 0, '1234', '1234', 'admin@trimtime.com'),
('st2', 'Alex Rivers', 'employee', 40, 'alex', 'password123', 'alex@trimtime.com')
on conflict (id) do nothing;

-- Initial Services
insert into services (id, name, price, duration, category) values
('s1', 'Classic Haircut', 35, 30, 'Hair'),
('s2', 'Skin Fade', 45, 45, 'Hair'),
('s3', 'Beard Trim', 20, 20, 'Beard'),
('s4', 'Luxury Shave', 50, 60, 'Shave'),
('s5', 'Kid''s Cut', 25, 30, 'Hair'),
('s6', 'Head Shave', 30, 30, 'Hair')
on conflict (id) do nothing;

-- Initial Products
insert into products (id, name, price, cost, stock, barcode) values
('p1', 'Pomade Matte', 18, 8, 24, '123456789012'),
('p2', 'Beard Oil', 22, 10, 15, '098765432109'),
('p3', 'Aftershave Balm', 25, 12, 10, '112233445566'),
('p4', 'Texture Spray', 20, 9, 8, '665544332211')
on conflict (id) do nothing;

-- Initial Customers
insert into customers (id, name, phone, email, notes, created_at) values
('c1', 'John Smith', '555-0101', 'john@example.com', 'Likes a low taper fade.', '2024-01-15'),
('c2', 'Marcus Brown', '555-0102', 'marcus@example.com', 'Grows beard long.', '2024-02-20')
on conflict (id) do nothing;
