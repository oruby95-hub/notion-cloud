# Notion Cloud Final 5.0

Cloud workspace/project tracker for Vercel + Supabase. No login required; access is by URL. Supports multiple workspaces, pages, editable categories, rows, Excel/Word/PDF/images/PPT and other files up to 100MB, external links, open/download/delete, and workspace deletion that also removes files from Supabase Storage.

## Vercel
Root Directory: `notion-lite-v4-cloud` if this folder is nested in the repository.
Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase
Run `supabase.sql` once. The app uses the private `project-files` bucket and server-side service role key only. Never commit `.env` or the service-role key.
