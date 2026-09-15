# Notion Lite V4 雲端版

功能：
- 多專案
- 同頁多分類，分類名稱可自行修改
- 多筆專案列
- 雲端資料庫
- 雲端檔案儲存
- 不需登入
- 分享網址
- 檔案上傳
- PDF / 圖片等可用瀏覽器開啟
- 其他檔案可下載
- 檔案刪除

## 設定
1. 到 Supabase 建立免費專案。
2. SQL Editor 執行 `supabase.sql`。
3. Project Settings → API 取得 Project URL 和 service_role key。
4. Vercel → Settings → Environment Variables 加：
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL
5. GitHub commit 後 Vercel 自動部署。

注意：service_role key 只能放 Vercel 環境變數，絕對不要放進前端程式或公開 GitHub。
