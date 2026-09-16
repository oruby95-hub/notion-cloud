create extension if not exists pgcrypto;

drop table if exists share_links cascade;
drop table if exists files cascade;
drop table if exists project_rows cascade;
drop table if exists sections cascade;
drop table if exists pages cascade;
drop table if exists projects cascade;

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default '未命名工作區',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default '新頁面',
  title text not null default '新頁面',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  page_id uuid not null references pages(id) on delete cascade,
  name text not null default '新分類',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_rows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  section_id uuid not null references sections(id) on delete cascade,
  item text not null default '新事項',
  project_need text not null default '',
  owner text not null default '',
  progress text not null default '',
  status text not null default '待確認',
  start_date date,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  row_id uuid not null references project_rows(id) on delete cascade,
  name text not null default '',
  size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  storage_path text not null default '',
  kind text not null default 'file',
  external_url text,
  created_at timestamptz not null default now()
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token text not null unique,
  permission text not null default 'edit',
  created_at timestamptz not null default now()
);

create index pages_project_id_idx on pages(project_id);
create index sections_project_id_idx on sections(project_id);
create index sections_page_id_idx on sections(page_id);
create index project_rows_project_id_idx on project_rows(project_id);
create index project_rows_section_id_idx on project_rows(section_id);
create index files_project_id_idx on files(project_id);
create index files_row_id_idx on files(row_id);
create index share_links_project_id_idx on share_links(project_id);
create index share_links_token_idx on share_links(token);

insert into storage.buckets(id,name,public,file_size_limit)
values('project-files','project-files',false,104857600)
on conflict(id) do update set
  public=false,
  file_size_limit=104857600;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on storage.objects to service_role;
grant all privileges on storage.buckets to service_role;

select table_name
from information_schema.tables
where table_schema='public'
and table_name in ('projects','pages','sections','project_rows','files','share_links')
order by table_name;
