import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const supabase = getSupabase();
  const b = await req.json();
  let data: any = null;
  let error: any = null;
  const projectId = params.projectId;

  if (b.action === "createPage") {
    ({ data, error } = await supabase.from("pages").insert({
      project_id: projectId,
      name: b.name || "新頁面",
      sort_order: b.sortOrder || 0,
    }).select().single());
  } else if (b.action === "createSection") {
    ({ data, error } = await supabase.from("sections").insert({
      page_id: b.pageId,
      name: b.name || "新分類",
      sort_order: b.sortOrder || 0,
    }).select().single());
  } else if (b.action === "createRow") {
    ({ data, error } = await supabase.from("project_rows").insert({
      section_id: b.sectionId,
      item: "新專案",
      status: "待確認",
      sort_order: b.sortOrder || 0,
    }).select().single());
  } else if (b.action === "updatePage") {
    ({ data, error } = await supabase.from("pages").update({
      name: b.name ?? b.title ?? "",
    }).eq("id", b.id).select().single());
  } else if (b.action === "updateSection") {
    ({ data, error } = await supabase.from("sections").update({
      name: b.name ?? "",
    }).eq("id", b.id).select().single());
  } else if (b.action === "updateRow") {
    ({ data, error } = await supabase.from("project_rows").update({
      item: b.item ?? "",
      assignee: b.assignee ?? b.owner ?? "",
      progress: b.progress ?? "",
      status: b.status ?? "待確認",
      start_date: b.start_date || null,
      due_date: b.due_date || null,
    }).eq("id", b.id).select().single());
  } else if (b.action === "share") {
    const token = crypto.randomUUID().replaceAll("-", "");
    ({ data, error } = await supabase.from("share_links").insert({
      project_id: projectId,
      token,
    }).select().single());
    if (!error) {
      const origin = new URL(req.url).origin;
      return NextResponse.json({ token, url: `${origin}/share/${token}` });
    }
  } else {
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
