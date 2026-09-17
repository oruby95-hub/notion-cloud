# Notion Cloud 5.2 — Supabase 整理版

本版本以 notion-cloud-final-5.2 為基礎，已統一 Supabase schema 與程式欄位。

Vercel Environment Variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Supabase SQL:
- `supabase.sql` 是乾淨重建版，會刪除並重建 6 張 public 資料表。
- Storage bucket `project-files` 為 private，單檔 100 MB。
- 實際檔案放 Storage；附件資訊放 `files`。

主要欄位：
- project_rows.project_need
- project_rows.owner
- files.kind
- files.external_url
- files.storage_path
- files.project_id

如果 GitHub repository 最外層仍是 `notion-cloud/`，Vercel Root Directory 請設 `notion-cloud`。
