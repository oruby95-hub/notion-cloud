import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = getSupabase();
  const link = await supabase.from("share_links").select("project_id").eq("token", params.token).single();
  if (link.error) return NextResponse.json({ error: "分享網址不存在" }, { status: 404 });

  const project = await supabase.from("projects").select("*").eq("id", link.data.project_id).single();
  if (project.error) return NextResponse.json({ error: "專案不存在" }, { status: 404 });
  const pages = await supabase.from("pages").select("*").eq("project_id", link.data.project_id).order("sort_order").order("created_at");
  if (pages.error) return NextResponse.json({ error: pages.error.message }, { status: 500 });
  const pageIds = (pages.data || []).map((p: any) => p.id);
  const sections = pageIds.length ? await supabase.from("sections").select("*").in("page_id", pageIds).order("sort_order") : { data: [], error: null } as any;
  const sectionIds = (sections.data || []).map((s: any) => s.id);
  const rows = sectionIds.length ? await supabase.from("project_rows").select("*").in("section_id", sectionIds).order("sort_order") : { data: [], error: null } as any;
  const rowIds = (rows.data || []).map((r: any) => r.id);
  const files = rowIds.length ? await supabase.from("files").select("*").in("row_id", rowIds).order("created_at") : { data: [], error: null } as any;
  const resultPages = (pages.data || []).map((p: any) => ({
    ...p, title: p.name,
    sections: (sections.data || []).filter((s: any) => s.page_id === p.id).map((s: any) => ({
      ...s,
      rows: (rows.data || []).filter((r: any) => r.section_id === s.id).map((r: any) => ({
        ...r, owner: r.assignee,
        files: (files.data || []).filter((f: any) => f.row_id === r.id).map((f: any) => ({ ...f, name: f.file_name }))
      }))
    }))
  }));
  return NextResponse.json({ ...project.data, pages: resultPages, sharePermission: "edit" });
}
