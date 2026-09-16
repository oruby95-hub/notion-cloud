# Storage 中文檔名修正

上傳到 Supabase Storage 時，Storage object key 只使用 UUID + 副檔名，不再使用原始中文檔名。

例如：
- 原始檔名：115租金管控表.xlsx
- Storage key：<projectId>/<rowId>/<uuid>.xlsx
- files.name：115租金管控表.xlsx

注意：先前版本已經產生、但目前 Storage 已被清空的舊附件無法恢復實體檔案；請在新版本部署後重新上傳一次。
