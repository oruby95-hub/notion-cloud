import { NextResponse } from "next/server";
import { getSupabase, BUCKET } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: { fileId: string } }) {
  const supabase = getSupabase();
  const mode = new URL(req.url).searchParams.get("mode") || "open";
  const f = await supabase.from("files").select("file_name,storage_path").eq("id", params.fileId).single();
  if (f.error) return NextResponse.json({ error: "找不到檔案" }, { status: 404 });
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(
    f.data.storage_path,
    3600,
    mode === "download" ? { download: f.data.file_name } : undefined
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
