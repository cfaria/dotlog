-- ============================================
-- DOTLOG - Esquema completo de base de datos
-- ============================================

-- 1. EXTENSIONES
-- ============================================
create extension if not exists "uuid-ossp";

-- 2. TABLA PROFILES (extiende auth.users)
-- ============================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger para crear perfil automáticamente al registrarse
-- (esto requiere una función, la hacemos más abajo)

-- 3. TABLA ENTRIES (entradas diarias)
-- ============================================
create table if not exists entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  level integer check (level between 1 and 5) not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Índices para rendimiento
-- ============================================
create index if not exists entries_user_id_idx on entries(user_id);
create index if not exists entries_date_idx on entries(date);
create index if not exists entries_user_date_idx on entries(user_id, date);

-- 4. TABLA MEDIA (fotos/videos)
-- ============================================
create table if not exists media (
  id uuid default uuid_generate_v4() primary key,
  entry_id uuid references entries(id) on delete cascade not null,
  storage_path text not null,
  type text check (type in ('image', 'video')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists media_entry_id_idx on media(entry_id);

-- 5. TABLA SHARE_SETTINGS (configuración de sharing)
-- ============================================
create table if not exists share_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  share_type text check (share_type in ('public', 'private', 'none')) default 'none',
  share_id text unique,
  allowed_emails text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

create index if not exists share_settings_share_id_idx on share_settings(share_id);

-- 6. ROW LEVEL SECURITY (RLS) - POLÍTICAS
-- ============================================

-- Profiles: usuarios solo ven su propio perfil
alter table profiles enable row level security;

create policy "Users can view own profile" 
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile" 
  on profiles for insert with check (auth.uid() = id);

-- Entries: usuarios solo ven/editan sus propias entradas
alter table entries enable row level security;

create policy "Users can view own entries" 
  on entries for select using (auth.uid() = user_id);

create policy "Users can insert own entries" 
  on entries for insert with check (auth.uid() = user_id);

create policy "Users can update own entries" 
  on entries for update using (auth.uid() = user_id);

create policy "Users can delete own entries" 
  on entries for delete using (auth.uid() = user_id);

-- Entries públicas: para compartir (se accede por share_id, no por user_id)
create policy "Anyone can view public entries by share_id"
  on entries for select 
  using (
    exists (
      select 1 from share_settings 
      where share_settings.user_id = entries.user_id 
      and share_settings.share_type = 'public'
    )
  );

-- Media: solo el dueño de la entrada puede ver los archivos
alter table media enable row level security;

create policy "Users can view media of own entries" 
  on media for select 
  using (
    exists (
      select 1 from entries 
      where entries.id = media.entry_id 
      and entries.user_id = auth.uid()
    )
  );

create policy "Users can insert media to own entries" 
  on media for insert 
  with check (
    exists (
      select 1 from entries 
      where entries.id = media.entry_id 
      and entries.user_id = auth.uid()
    )
  );

create policy "Users can delete own media" 
  on media for delete 
  using (
    exists (
      select 1 from entries 
      where entries.id = media.entry_id 
      and entries.user_id = auth.uid()
    )
  );

-- Share settings: solo el dueño puede ver/modificar
alter table share_settings enable row level security;

create policy "Users can view own share settings" 
  on share_settings for select using (auth.uid() = user_id);

create policy "Users can insert own share settings" 
  on share_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own share settings" 
  on share_settings for update using (auth.uid() = user_id);

-- Share settings públicas: cualquiera puede ver (para validar share_id)
create policy "Anyone can view public share settings"
  on share_settings for select
  using (share_type = 'public');

-- 7. FUNCIONES Y TRIGGERS
-- ============================================

-- Auto-actualizar updated_at
-- (Supabase ya tiene updated_at() pero por si no)

-- Trigger para crear perfil al registrarse
-- Necesitamos una función que maneje el webhook de auth

-- Función para generar share_id único
-- (puedes generarlo desde el cliente o aquí)

-- 8. BUCKET DE STORAGE (para imágenes/videos)
-- ============================================
-- Esto se hace desde la UI de Supabase:
-- Storage → New bucket → "media" → Public: false
-- Luego políticas:
--   - Insert: auth.uid() IS NOT NULL
--   - Select: auth.uid() IS NOT NULL (o público si quieres)
--   - Delete: auth.uid() IS NOT NULL

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================
