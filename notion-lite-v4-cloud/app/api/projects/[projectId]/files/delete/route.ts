import { NextResponse } from "next/server";
import { getSupabase, BUCKET } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const supabase = getSupabase();
  const { fileId } = await req.json();
  const f = await supabase.from("files").select("storage_path,row_id").eq("id", fileId).single();
  if (f.error) return NextResponse.json({ error: "找不到檔案" }, { status: 404 });

  const r = await supabase.from("project_rows").select("id,section_id").eq("id", f.data.row_id).single();
  if (r.error) return NextResponse.json({ error: "找不到資料列" }, { status: 404 });
  const s = await supabase.from("sections").select("id,page_id").eq("id", r.data.section_id).single();
  if (s.error) return NextResponse.json({ error: "找不到分類" }, { status: 404 });
  const p = await supabase.from("pages").select("id,project_id").eq("id", s.data.page_id).single();
  if (p.error || p.data.project_id !== params.projectId) return NextResponse.json({ error: "無效的專案" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([f.data.storage_path]);
  const d = await supabase.from("files").delete().eq("id", fileId);
  if (d.error) return NextResponse.json({ error: d.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
