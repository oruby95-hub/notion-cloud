"use client";
import { useEffect, useState } from "react";

export default function SharedPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/share/${params.token}`).then(async r => {
      const x = await r.json();
      if (!r.ok) throw new Error(x.error || "載入失敗");
      setData(x);
    }).catch(e => setError(e.message));
  }, [params.token]);
  if (error) return <div className="loading">{error}</div>;
  if (!data) return <div className="loading">分享資料載入中…</div>;
  return <main className="app"><section className="main" style={{ width: "100%" }}><header><b>📋 {data.name}</b><span>🔗 分享檢視</span></header><article style={{ padding: 24 }}>{(data.pages || []).map((p: any) => <section key={p.id} className="card"><div className="head"><h2>{p.name}</h2></div>{(p.sections || []).map((s: any) => <section key={s.id} className="card"><div className="sect"><strong>{s.name}</strong></div><div className="scroll"><table><thead><tr><th>Item</th><th>擔當者</th><th>目前執行狀況</th><th>狀態</th><th>開案日期</th><th>限期日期</th><th>檔案</th></tr></thead><tbody>{(s.rows || []).map((r: any) => <tr key={r.id}><td>{r.item}</td><td>{r.owner}</td><td>{r.progress}</td><td>{r.status}</td><td>{r.start_date || ""}</td><td>{r.due_date || ""}</td><td>{(r.files || []).map((f: any) => <div className="file" key={f.id}><strong>{f.name}</strong><a href={`/api/files/${f.id}?mode=open`} target="_blank">開啟</a><a href={`/api/files/${f.id}?mode=download`}>下載</a></div>)}</td></tr>)}</tbody></table></div></section>)}</section>)}</article></section></main>;
}
