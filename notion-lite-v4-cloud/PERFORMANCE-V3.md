# 5.2 Performance V3

本版本延續 5.2-final-optimized-v2：
- 工作區切換優先使用前端快取。
- 附件使用 UUID + 副檔名的 Storage key，原始檔名只保存於 DB。
- 事項可移動分類。
- CRUD 操作加入前端 pending 狀態與同步提示，避免使用者誤以為沒有動作。
- 上傳操作不應重新抓整個工作區。
- 同步失敗時重新抓取目前工作區以回復一致狀態。

部署時不需要修改 Supabase schema。
