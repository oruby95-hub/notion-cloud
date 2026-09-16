# Notion Cloud 5.2 Stable Fast

這是以 5.2 Supabase 版為基礎的穩定附件/效能版。

重點：
- Supabase URL + service role key 採 server-only lazy client。
- 所有檔案 Storage key 使用 UUID + 副檔名，不使用中文原始檔名。
- 原始檔名保存在 files.name。
- Storage 成功後才寫 files；DB 失敗會回滾 Storage。
- URL 附件驗證 row，並相容舊 project_id 為空的 row。
- 不需要重新建立 Supabase schema。
- Vercel 使用既有 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY。

注意：本包未包含 node_modules/.next；部署環境會重新安裝與 build。
