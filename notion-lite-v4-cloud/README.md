# Notion Cloud 5.2 — Supabase Storage 優化版

這個版本以 `notion-cloud-final-5.2` 為基礎調整：

- 移除「新頁面」管理功能，工作區直接使用單一隱藏預設頁面。
- 編輯文字時採 650ms 延遲儲存，不再每打一個字就重新抓整個工作區，降低卡頓。
- 附件實體檔案上傳到 Supabase Storage `project-files`。
- 上傳成功後才寫入 `files`；寫入失敗會自動刪掉剛上傳的 Storage 檔案。
- 刪除附件時同時刪 Storage 實體檔案與 `files` 紀錄。
- 刪除工作區時會清理該工作區所有 Storage 檔案，再刪除 Database 資料。
- 支援 Excel、Word、PDF、PPT、圖片及其他檔案，單檔 100MB。
- 網址附件只儲存 URL，不會上傳到 Storage。

## Vercel
環境變數只需：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

如果 GitHub repository 根目錄是 `notion-cloud` 資料夾，Vercel Root Directory 填 `notion-cloud`。
