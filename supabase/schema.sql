-- ============================================================
-- ATLAS PLATFORM — SCHEMA COMPLET
-- À coller dans Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type user_role as enum ('admin_global', 'admin_org', 'agent', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type company_request_status as enum (
    'draft',
    'info_submitted',
    'kyc_required',
    'kyc_in_review',
    'submitted_companies_house',
    'company_created',
    'branch_preparation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_category as enum (
    'identity',
    'bank_statement',
    'proof_of_address',
    'company',
    'invoice',
    'contract',
    'branch',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_visibility as enum ('client', 'internal', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'cancelled', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commission_status as enum ('pending', 'validated', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commission_type as enum ('fixed', 'percentage');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shareholder_type as enum ('person', 'company');
exception when duplicate_object then null; end $$;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

create table if not exists organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Atlas Incorporate', 'atlas')
on conflict (slug) do nothing;

-- ============================================================
-- USER PROFILES
-- ============================================================

create table if not exists user_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  org_id                uuid references organizations(id) on delete set null,
  role                  user_role not null default 'client',
  first_name            text,
  last_name             text,
  email                 text,
  phone                 text,
  avatar_url            text,
  is_active             boolean not null default true,
  assigned_agent_id     uuid references user_profiles(id) on delete set null,
  invited_by            uuid references user_profiles(id) on delete set null,
  referral_code         text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_user_profiles_org_id on user_profiles(org_id);
create index if not exists idx_user_profiles_role on user_profiles(role);
create index if not exists idx_user_profiles_agent on user_profiles(assigned_agent_id);

-- ============================================================
-- INVITATIONS
-- ============================================================

create table if not exists invitations (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id) on delete cascade,
  email         text not null,
  role          user_role not null default 'client',
  token         text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid references user_profiles(id) on delete set null,
  agent_id      uuid references user_profiles(id) on delete set null,
  accepted_at   timestamptz,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_email on invitations(email);

-- ============================================================
-- COMPANY REQUESTS
-- ============================================================

create table if not exists company_requests (
  id                      uuid primary key default uuid_generate_v4(),
  org_id                  uuid references organizations(id) on delete set null,
  client_id               uuid not null references user_profiles(id) on delete cascade,
  assigned_agent_id       uuid references user_profiles(id) on delete set null,

  status                  company_request_status not null default 'draft',

  -- Proposed names (up to 3)
  proposed_names          text[] default '{}',

  -- SIC codes (up to 4)
  sic_codes               text[] default '{}',

  -- Capital
  share_capital           numeric(12,2) default 100,
  share_value             numeric(12,2) default 1,
  share_count             integer default 100,

  -- Shareholders (JSONB array)
  shareholders            jsonb default '[]',

  -- Director (PSC)
  director_first_name     text,
  director_last_name      text,
  director_dob            date,
  director_nationality    text,
  director_address_line1  text,
  director_address_line2  text,
  director_city           text,
  director_postcode       text,
  director_country        text,

  -- Branch options
  needs_branch_ch         boolean default false,
  needs_branch_fr         boolean default false,

  -- Company details (filled after creation)
  company_number          text,
  company_name_final      text,
  incorporation_date      date,

  -- Internal notes
  admin_notes             text,

  submitted_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_company_requests_client on company_requests(client_id);
create index if not exists idx_company_requests_agent on company_requests(assigned_agent_id);
create index if not exists idx_company_requests_status on company_requests(status);

-- ============================================================
-- ORDERS
-- ============================================================

create table if not exists orders (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid references organizations(id) on delete set null,
  client_id         uuid not null references user_profiles(id) on delete cascade,
  agent_id          uuid references user_profiles(id) on delete set null,
  company_request_id uuid references company_requests(id) on delete set null,

  status            order_status not null default 'pending',
  title             text not null,
  description       text,
  total_amount      numeric(12,2) default 0,

  admin_notes       text,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_orders_client on orders(client_id);
create index if not exists idx_orders_agent on orders(agent_id);
create index if not exists idx_orders_status on orders(status);

-- ============================================================
-- INVOICES
-- ============================================================

create table if not exists invoices (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organizations(id) on delete set null,
  order_id        uuid references orders(id) on delete set null,
  client_id       uuid not null references user_profiles(id) on delete cascade,
  agent_id        uuid references user_profiles(id) on delete set null,

  invoice_number  text unique not null,
  status          invoice_status not null default 'draft',

  subtotal        numeric(12,2) not null default 0,
  tax_rate        numeric(5,2) default 0,
  tax_amount      numeric(12,2) default 0,
  total           numeric(12,2) not null default 0,
  currency        text not null default 'GBP',

  due_date        date,
  paid_at         timestamptz,
  payment_method  text,
  payment_ref     text,

  -- CGV acceptance
  cgv_version     text,
  cgv_accepted    boolean default false,
  cgv_accepted_at timestamptz,

  pdf_url         text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_invoices_client on invoices(client_id);
create index if not exists idx_invoices_agent on invoices(agent_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_order on invoices(order_id);

-- Auto-generate invoice number
create or replace function generate_invoice_number()
returns trigger as $$
declare
  seq int;
  yr  text;
begin
  yr  := to_char(now(), 'YYYY');
  select coalesce(max(split_part(invoice_number, '-', 3)::int), 0) + 1
    into seq
    from invoices
   where invoice_number like 'ATL-' || yr || '-%';
  new.invoice_number := 'ATL-' || yr || '-' || lpad(seq::text, 4, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_invoice_number on invoices;
create trigger trg_invoice_number
  before insert on invoices
  for each row
  when (new.invoice_number is null or new.invoice_number = '')
  execute function generate_invoice_number();

-- ============================================================
-- BILLING ITEMS
-- ============================================================

create table if not exists billing_items (
  id            uuid primary key default uuid_generate_v4(),
  invoice_id    uuid not null references invoices(id) on delete cascade,
  label         text not null,
  quantity      numeric(10,2) not null default 1,
  unit_price    numeric(12,2) not null,
  total         numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at    timestamptz not null default now()
);

create index if not exists idx_billing_items_invoice on billing_items(invoice_id);

-- ============================================================
-- COMMISSIONS
-- ============================================================

create table if not exists commission_rules (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id) on delete cascade,
  invoice_id    uuid references invoices(id) on delete cascade,
  order_id      uuid references orders(id) on delete cascade,
  agent_id      uuid not null references user_profiles(id) on delete cascade,

  type          commission_type not null default 'percentage',
  value         numeric(10,2) not null,

  created_by    uuid references user_profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_commission_rules_agent on commission_rules(agent_id);
create index if not exists idx_commission_rules_invoice on commission_rules(invoice_id);

create table if not exists commissions (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id) on delete set null,
  agent_id      uuid not null references user_profiles(id) on delete cascade,
  invoice_id    uuid references invoices(id) on delete set null,
  order_id      uuid references orders(id) on delete set null,
  client_id     uuid references user_profiles(id) on delete set null,

  type          commission_type not null default 'percentage',
  rate          numeric(10,2),
  amount        numeric(12,2) not null,
  currency      text not null default 'GBP',
  status        commission_status not null default 'pending',

  paid_at       timestamptz,
  note          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_commissions_agent on commissions(agent_id);
create index if not exists idx_commissions_invoice on commissions(invoice_id);
create index if not exists idx_commissions_status on commissions(status);

-- Trigger: create commission when invoice status becomes 'paid'
create or replace function create_commission_on_payment()
returns trigger as $$
declare
  rule commission_rules%rowtype;
  commission_amount numeric(12,2);
begin
  if new.status = 'paid' and old.status != 'paid' then
    select * into rule
      from commission_rules
     where invoice_id = new.id
     limit 1;

    if not found then
      select * into rule
        from commission_rules
       where order_id = new.order_id
       limit 1;
    end if;

    if found then
      if rule.type = 'fixed' then
        commission_amount := rule.value;
      else
        commission_amount := (new.total * rule.value / 100);
      end if;

      insert into commissions (
        org_id, agent_id, invoice_id, order_id, client_id,
        type, rate, amount, currency
      ) values (
        new.org_id, rule.agent_id, new.id, new.order_id, new.client_id,
        rule.type, rule.value, commission_amount, new.currency
      );

      update invoices set paid_at = now() where id = new.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_commission_on_payment on invoices;
create trigger trg_commission_on_payment
  after update on invoices
  for each row
  execute function create_commission_on_payment();

-- ============================================================
-- AGENT BONUS RULES
-- ============================================================

create table if not exists agent_bonus_rules (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organizations(id) on delete cascade,
  tier_name       text not null,
  min_sales_count integer,
  min_revenue     numeric(12,2),
  bonus_amount    numeric(12,2),
  bonus_type      commission_type not null default 'fixed',
  description     text,
  is_active       boolean not null default true,
  sort_order      integer default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into agent_bonus_rules (org_id, tier_name, min_sales_count, min_revenue, bonus_amount, bonus_type, description, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Bronze', 0, 0, 0, 'fixed', 'Niveau de départ', 0),
  ('00000000-0000-0000-0000-000000000001', 'Silver', 5, 5000, 200, 'fixed', '5 ventes ou 5 000 GBP de CA', 1),
  ('00000000-0000-0000-0000-000000000001', 'Gold', 15, 20000, 600, 'fixed', '15 ventes ou 20 000 GBP de CA', 2),
  ('00000000-0000-0000-0000-000000000001', 'Elite', 30, 50000, 1500, 'fixed', '30 ventes ou 50 000 GBP de CA', 3),
  ('00000000-0000-0000-0000-000000000001', 'Platinum', 60, 120000, 4000, 'fixed', '60 ventes ou 120 000 GBP de CA', 4)
on conflict do nothing;

-- ============================================================
-- MEMBER TIERS (Atlas Circle for clients)
-- ============================================================

create table if not exists member_tiers (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organizations(id) on delete cascade,
  tier_name       text not null,
  min_orders      integer default 0,
  min_spend       numeric(12,2) default 0,
  benefits        text[],
  color           text,
  icon            text,
  sort_order      integer default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

insert into member_tiers (org_id, tier_name, min_orders, min_spend, benefits, color, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'Bronze', 0, 0, ARRAY['Accès plateforme', 'Support email'], '#cd7f32', 0),
  ('00000000-0000-0000-0000-000000000001', 'Silver', 2, 2000, ARRAY['Support prioritaire', 'Réductions partenaires', '1 consultation offerte'], '#94a3b8', 1),
  ('00000000-0000-0000-0000-000000000001', 'Gold', 5, 8000, ARRAY['Account manager dédié', 'Réductions 10%', 'Services express'], '#eab308', 2),
  ('00000000-0000-0000-0000-000000000001', 'Elite', 10, 25000, ARRAY['Gestionnaire VIP', 'Réductions 15%', 'Accès early services', 'Invitation événements'], '#f43f5e', 3),
  ('00000000-0000-0000-0000-000000000001', 'Platinum', 20, 75000, ARRAY['Service white-glove', 'Réductions 20%', 'Conciergerie dédiée', 'Accès exclusif'], '#06b6d4', 4)
on conflict do nothing;

-- ============================================================
-- DOCUMENTS
-- ============================================================

create table if not exists documents (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid references organizations(id) on delete set null,
  client_id         uuid not null references user_profiles(id) on delete cascade,
  uploaded_by       uuid references user_profiles(id) on delete set null,
  company_request_id uuid references company_requests(id) on delete set null,

  category          document_category not null default 'other',
  visibility        document_visibility not null default 'client',

  name              text not null,
  label             text,
  storage_path      text not null,
  mime_type         text,
  size_bytes        bigint,

  is_verified       boolean default false,
  verified_by       uuid references user_profiles(id) on delete set null,
  verified_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_documents_client on documents(client_id);
create index if not exists idx_documents_category on documents(category);
create index if not exists idx_documents_visibility on documents(visibility);

-- ============================================================
-- CONTRACT ACCEPTANCES
-- ============================================================

create table if not exists contract_acceptances (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid references organizations(id) on delete set null,
  invoice_id          uuid references invoices(id) on delete set null,
  order_id            uuid references orders(id) on delete set null,
  accepted_by_user_id uuid not null references user_profiles(id) on delete cascade,

  company_name        text,
  first_name          text not null,
  last_name           text not null,
  email               text not null,

  cgv_version         text not null,
  acceptance_snapshot text not null,
  ip_address          text,
  user_agent          text,

  accepted_at         timestamptz not null default now()
);

create index if not exists idx_contract_acceptances_user on contract_acceptances(accepted_by_user_id);
create index if not exists idx_contract_acceptances_invoice on contract_acceptances(invoice_id);

-- ============================================================
-- ORG SETTINGS
-- ============================================================

create table if not exists org_settings (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid unique not null references organizations(id) on delete cascade,
  atlas_circle_rules jsonb default '{}',
  commission_defaults jsonb default '{}',
  cgv_current_version text default 'v1.0',
  cgv_content     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into org_settings (org_id, atlas_circle_rules, cgv_current_version)
values ('00000000-0000-0000-0000-000000000001', '{}', 'v1.0')
on conflict (org_id) do nothing;

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_profiles', 'company_requests', 'orders',
    'invoices', 'commissions', 'agent_bonus_rules',
    'org_settings', 'documents', 'organizations'
  ]
  loop
    execute format(
      'drop trigger if exists trg_updated_at_%I on %I;
       create trigger trg_updated_at_%I before update on %I
         for each row execute function set_updated_at();',
      t, t, t, t
    );
  end loop;
end;
$$;

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
declare
  inv invitations%rowtype;
  default_org_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  select * into inv
    from invitations
   where email = new.email
     and accepted_at is null
     and expires_at > now()
   order by created_at desc
   limit 1;

  insert into user_profiles (id, email, first_name, last_name, org_id, role, is_active, assigned_agent_id, invited_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    default_org_id,
    case when found then inv.role else 'client' end,
    case when found then true else false end,
    case when found then inv.agent_id else null end,
    case when found then inv.invited_by else null end
  );

  if found then
    update invitations set accepted_at = now() where id = inv.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RLS — ENABLE
-- ============================================================

alter table organizations       enable row level security;
alter table user_profiles       enable row level security;
alter table invitations         enable row level security;
alter table company_requests    enable row level security;
alter table orders              enable row level security;
alter table invoices            enable row level security;
alter table billing_items       enable row level security;
alter table commissions         enable row level security;
alter table commission_rules    enable row level security;
alter table agent_bonus_rules   enable row level security;
alter table member_tiers        enable row level security;
alter table documents           enable row level security;
alter table contract_acceptances enable row level security;
alter table org_settings        enable row level security;

-- ============================================================
-- HELPER FUNCTIONS (RLS)
-- ============================================================

create or replace function auth_role()
returns user_role as $$
  select role from user_profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function auth_org_id()
returns uuid as $$
  select org_id from user_profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function is_admin()
returns boolean as $$
  select auth_role() in ('admin_global', 'admin_org')
$$ language sql security definer stable;

create or replace function is_agent_of(p_client_id uuid)
returns boolean as $$
  select exists (
    select 1 from user_profiles
     where id = p_client_id
       and assigned_agent_id = auth.uid()
  )
$$ language sql security definer stable;

-- ============================================================
-- RLS POLICIES — ORGANIZATIONS
-- ============================================================

drop policy if exists "orgs_select" on organizations;
create policy "orgs_select" on organizations
  for select using (true);

-- ============================================================
-- RLS POLICIES — USER PROFILES
-- ============================================================

drop policy if exists "profiles_select_self" on user_profiles;
create policy "profiles_select_self" on user_profiles
  for select using (
    auth.uid() = id
    or is_admin()
    or (auth_role() = 'agent' and assigned_agent_id = auth.uid())
  );

drop policy if exists "profiles_update_self" on user_profiles;
create policy "profiles_update_self" on user_profiles
  for update using (auth.uid() = id or is_admin());

drop policy if exists "profiles_insert_admin" on user_profiles;
create policy "profiles_insert_admin" on user_profiles
  for insert with check (is_admin());

drop policy if exists "profiles_delete_admin" on user_profiles;
create policy "profiles_delete_admin" on user_profiles
  for delete using (is_admin());

-- ============================================================
-- RLS POLICIES — INVITATIONS
-- ============================================================

drop policy if exists "invitations_select" on invitations;
create policy "invitations_select" on invitations
  for select using (is_admin() or invited_by = auth.uid() or agent_id = auth.uid());

drop policy if exists "invitations_insert" on invitations;
create policy "invitations_insert" on invitations
  for insert with check (is_admin() or auth_role() = 'agent');

drop policy if exists "invitations_update_admin" on invitations;
create policy "invitations_update_admin" on invitations
  for update using (is_admin());

-- ============================================================
-- RLS POLICIES — COMPANY REQUESTS
-- ============================================================

drop policy if exists "company_requests_select" on company_requests;
create policy "company_requests_select" on company_requests
  for select using (
    is_admin()
    or client_id = auth.uid()
    or (auth_role() = 'agent' and assigned_agent_id = auth.uid())
  );

drop policy if exists "company_requests_insert" on company_requests;
create policy "company_requests_insert" on company_requests
  for insert with check (
    is_admin()
    or client_id = auth.uid()
    or (auth_role() = 'agent' and is_agent_of(client_id))
  );

drop policy if exists "company_requests_update" on company_requests;
create policy "company_requests_update" on company_requests
  for update using (
    is_admin()
    or client_id = auth.uid()
    or (auth_role() = 'agent' and assigned_agent_id = auth.uid())
  );

drop policy if exists "company_requests_delete" on company_requests;
create policy "company_requests_delete" on company_requests
  for delete using (is_admin());

-- ============================================================
-- RLS POLICIES — ORDERS
-- ============================================================

drop policy if exists "orders_select" on orders;
create policy "orders_select" on orders
  for select using (
    is_admin()
    or client_id = auth.uid()
    or agent_id = auth.uid()
  );

drop policy if exists "orders_insert_admin" on orders;
create policy "orders_insert_admin" on orders
  for insert with check (is_admin() or auth_role() = 'agent');

drop policy if exists "orders_update_admin" on orders;
create policy "orders_update_admin" on orders
  for update using (is_admin());

drop policy if exists "orders_delete_admin" on orders;
create policy "orders_delete_admin" on orders
  for delete using (is_admin());

-- ============================================================
-- RLS POLICIES — INVOICES
-- ============================================================

drop policy if exists "invoices_select" on invoices;
create policy "invoices_select" on invoices
  for select using (
    is_admin()
    or client_id = auth.uid()
    or agent_id = auth.uid()
  );

drop policy if exists "invoices_insert_admin" on invoices;
create policy "invoices_insert_admin" on invoices
  for insert with check (is_admin());

drop policy if exists "invoices_update_admin" on invoices;
create policy "invoices_update_admin" on invoices
  for update using (is_admin());

drop policy if exists "invoices_delete_admin" on invoices;
create policy "invoices_delete_admin" on invoices
  for delete using (is_admin());

-- ============================================================
-- RLS POLICIES — BILLING ITEMS
-- ============================================================

drop policy if exists "billing_items_select" on billing_items;
create policy "billing_items_select" on billing_items
  for select using (
    exists (
      select 1 from invoices i
       where i.id = billing_items.invoice_id
         and (is_admin() or i.client_id = auth.uid() or i.agent_id = auth.uid())
    )
  );

drop policy if exists "billing_items_manage_admin" on billing_items;
create policy "billing_items_manage_admin" on billing_items
  for all using (is_admin());

-- ============================================================
-- RLS POLICIES — COMMISSIONS
-- ============================================================

drop policy if exists "commissions_select" on commissions;
create policy "commissions_select" on commissions
  for select using (is_admin() or agent_id = auth.uid());

drop policy if exists "commissions_update_admin" on commissions;
create policy "commissions_update_admin" on commissions
  for update using (is_admin());

drop policy if exists "commissions_insert_system" on commissions;
create policy "commissions_insert_system" on commissions
  for insert with check (is_admin());

-- ============================================================
-- RLS POLICIES — COMMISSION RULES
-- ============================================================

drop policy if exists "commission_rules_select" on commission_rules;
create policy "commission_rules_select" on commission_rules
  for select using (is_admin() or agent_id = auth.uid());

drop policy if exists "commission_rules_manage_admin" on commission_rules;
create policy "commission_rules_manage_admin" on commission_rules
  for all using (is_admin());

-- ============================================================
-- RLS POLICIES — AGENT BONUS RULES
-- ============================================================

drop policy if exists "agent_bonus_rules_select" on agent_bonus_rules;
create policy "agent_bonus_rules_select" on agent_bonus_rules
  for select using (true);

drop policy if exists "agent_bonus_rules_manage_admin" on agent_bonus_rules;
create policy "agent_bonus_rules_manage_admin" on agent_bonus_rules
  for all using (is_admin());

-- ============================================================
-- RLS POLICIES — MEMBER TIERS
-- ============================================================

drop policy if exists "member_tiers_select" on member_tiers;
create policy "member_tiers_select" on member_tiers
  for select using (true);

drop policy if exists "member_tiers_manage_admin" on member_tiers;
create policy "member_tiers_manage_admin" on member_tiers
  for all using (is_admin());

-- ============================================================
-- RLS POLICIES — DOCUMENTS
-- ============================================================

drop policy if exists "documents_select" on documents;
create policy "documents_select" on documents
  for select using (
    is_admin()
    or (client_id = auth.uid() and visibility = 'client')
    or (auth_role() = 'agent' and is_agent_of(client_id) and visibility in ('client', 'internal'))
  );

drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents
  for insert with check (
    is_admin()
    or uploaded_by = auth.uid()
    or (auth_role() = 'agent' and is_agent_of(client_id))
  );

drop policy if exists "documents_update_admin" on documents;
create policy "documents_update_admin" on documents
  for update using (is_admin());

drop policy if exists "documents_delete" on documents;
create policy "documents_delete" on documents
  for delete using (
    is_admin()
    or (uploaded_by = auth.uid() and client_id = auth.uid())
  );

-- ============================================================
-- RLS POLICIES — CONTRACT ACCEPTANCES
-- ============================================================

drop policy if exists "contract_acceptances_select" on contract_acceptances;
create policy "contract_acceptances_select" on contract_acceptances
  for select using (
    is_admin()
    or accepted_by_user_id = auth.uid()
  );

drop policy if exists "contract_acceptances_insert" on contract_acceptances;
create policy "contract_acceptances_insert" on contract_acceptances
  for insert with check (accepted_by_user_id = auth.uid());

-- ============================================================
-- RLS POLICIES — ORG SETTINGS
-- ============================================================

drop policy if exists "org_settings_select" on org_settings;
create policy "org_settings_select" on org_settings
  for select using (true);

drop policy if exists "org_settings_update_admin" on org_settings;
create policy "org_settings_update_admin" on org_settings
  for update using (is_admin());

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "storage_select" on storage.objects;
create policy "storage_select" on storage.objects
  for select using (
    bucket_id = 'client-documents'
    and (
      is_admin()
      or exists (
        select 1 from documents d
         where d.storage_path = name
           and (
             d.client_id = auth.uid()
             or (auth_role() = 'agent' and is_agent_of(d.client_id))
           )
      )
    )
  );

drop policy if exists "storage_insert" on storage.objects;
create policy "storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'client-documents'
    and (is_admin() or auth.uid() is not null)
  );

drop policy if exists "storage_delete" on storage.objects;
create policy "storage_delete" on storage.objects
  for delete using (
    bucket_id = 'client-documents'
    and is_admin()
  );

-- ============================================================
-- USEFUL INDEXES
-- ============================================================

create index if not exists idx_invoices_paid_at on invoices(paid_at) where status = 'paid';
create index if not exists idx_commissions_paid_at on commissions(paid_at) where status = 'paid';
create index if not exists idx_documents_storage_path on documents(storage_path);
