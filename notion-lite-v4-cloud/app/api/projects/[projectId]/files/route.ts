import { NextResponse } from "next/server";
import { getSupabase, BUCKET } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const supabase = getSupabase();
  const form = await req.formData();
  const rowId = String(form.get("rowId") || "");
  const file = form.get("file");
  if (!(file instanceof File) || !rowId) return NextResponse.json({ error: "缺少檔案或列 ID" }, { status: 400 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "單檔上限 100 MB" }, { status: 400 });

  const id = crypto.randomUUID();
  const safe = file.name.replace(/[^\w.\-\u4e00-\u9fff ]/g, "_");
  const path = `${params.projectId}/${rowId}/${id}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const up = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || "application/octet-stream",
  });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  const ins = await supabase.from("files").insert({
    id,
    row_id: rowId,
    file_name: file.name,
    size: file.size,
    mime_type: file.type || "application/octet-stream",
    storage_path: path,
  }).select().single();
  if (ins.error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  return NextResponse.json(ins.data);
}
