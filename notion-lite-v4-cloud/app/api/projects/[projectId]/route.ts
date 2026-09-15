import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const supabase = getSupabase();
  const id = params.projectId;
  const project = await supabase.from("projects").select("*").eq("id", id).single();
  if (project.error) return NextResponse.json({ error: project.error.message }, { status: 404 });

  const pages = await supabase.from("pages").select("*").eq("project_id", id).order("sort_order").order("created_at");
  if (pages.error) return NextResponse.json({ error: pages.error.message }, { status: 500 });

  const pageIds = (pages.data || []).map((p: any) => p.id);
  const sections = pageIds.length
    ? await supabase.from("sections").select("*").in("page_id", pageIds).order("sort_order")
    : { data: [], error: null } as any;
  if (sections.error) return NextResponse.json({ error: sections.error.message }, { status: 500 });

  const sectionIds = (sections.data || []).map((s: any) => s.id);
  const rows = sectionIds.length
    ? await supabase.from("project_rows").select("*").in("section_id", sectionIds).order("sort_order")
    : { data: [], error: null } as any;
  if (rows.error) return NextResponse.json({ error: rows.error.message }, { status: 500 });

  const rowIds = (rows.data || []).map((r: any) => r.id);
  const files = rowIds.length
    ? await supabase.from("files").select("*").in("row_id", rowIds).order("created_at")
    : { data: [], error: null } as any;
  if (files.error) return NextResponse.json({ error: files.error.message }, { status: 500 });

  const resultPages = (pages.data || []).map((p: any) => ({
    ...p,
    title: p.name,
    sections: (sections.data || []).filter((s: any) => s.page_id === p.id).map((s: any) => ({
      ...s,
      rows: (rows.data || []).filter((r: any) => r.section_id === s.id).map((r: any) => ({
        ...r,
        owner: r.assignee,
        files: (files.data || []).filter((f: any) => f.row_id === r.id).map((f: any) => ({
          ...f,
          name: f.file_name,
        })),
      })),
    })),
  }));

  return NextResponse.json({ ...project.data, pages: resultPages });
}

export async function PATCH(req: Request, { params }: { params: { projectId: string } }) {
  const supabase = getSupabase();
  const b = await req.json();
  const { data, error } = await supabase.from("projects")
    .update({ name: String(b.name || "").trim() })
    .eq("id", params.projectId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
