create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default '新頁面',
  title text,
  created_at timestamptz not null default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  page_id uuid not null references pages(id) on delete cascade,
  name text not null default '新分類',
  sort_order integer not null default 0
);

create table if not exists project_rows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  section_id uuid not null references sections(id) on delete cascade,
  item text not null default '新事項',
  project_need text not null default '',
  owner text not null default '',
  progress text not null default '',
  status text not null default '待確認',
  start_date date,
  due_date date,
  sort_order integer not null default 0
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  row_id uuid not null references project_rows(id) on delete cascade,
  name text not null,
  size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  storage_path text not null default '',
  kind text not null default 'file',
  external_url text,
  created_at timestamptz not null default now()
);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token text not null unique,
  permission text not null default 'edit',
  created_at timestamptz not null default now()
);

alter table pages add column if not exists title text;
alter table sections add column if not exists project_id uuid;
alter table project_rows add column if not exists project_id uuid;
alter table project_rows add column if not exists project_need text not null default '';
alter table files add column if not exists project_id uuid;
alter table files add column if not exists kind text not null default 'file';
alter table files add column if not exists external_url text;

update pages set title = coalesce(nullif(title,''), nullif(name,''), '新頁面') where title is null or title='';
update sections s set project_id = p.project_id from pages p where s.page_id=p.id and s.project_id is null;
update project_rows r set project_id = s.project_id from sections s where r.section_id=s.id and r.project_id is null;
update files f set project_id = r.project_id from project_rows r where f.row_id=r.id and f.project_id is null;

alter table pages alter column title set default '新頁面';
alter table sections alter column project_id set default null;
alter table project_rows alter column project_id set default null;
alter table files alter column project_id set default null;

create index if not exists pages_project_id_idx on pages(project_id);
create index if not exists sections_project_id_idx on sections(project_id);
create index if not exists sections_page_id_idx on sections(page_id);
create index if not exists project_rows_project_id_idx on project_rows(project_id);
create index if not exists project_rows_section_id_idx on project_rows(section_id);
create index if not exists files_project_id_idx on files(project_id);
create index if not exists files_row_id_idx on files(row_id);
create index if not exists share_links_project_id_idx on share_links(project_id);

insert into storage.buckets(id,name,public,file_size_limit)
values('project-files','project-files',false,104857600)
on conflict(id) do update set file_size_limit=104857600;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
