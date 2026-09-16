# 中文檔名附件修正版

本版本的原始中文檔名不再直接拿來當 Supabase Storage object key。
Storage 使用 UUID + 原始副檔名；原始檔名保留在 `files.name`。

因此：
- `115租金管控表.xlsx` 可以上傳
- Word/PDF/PPT/中文圖片檔名可以上傳
- 開啟/下載使用 DB 中的原始檔名
- 刪除依 `storage_path` 刪除 Storage 實體檔案

如果 Vercel 已連接 GitHub，請重新部署此版本。
