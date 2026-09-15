import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
export async function GET(){try{const {data,error}=await getSupabase().from('projects').select('*').order('created_at');if(error)throw error;return NextResponse.json(data||[])}catch(e:any){return NextResponse.json({error:e.message},{status:500})}}
export async function POST(req:Request){try{const b=await req.json();const name=String(b.name||'').trim();if(!name)return NextResponse.json({error:'請輸入工作區名稱'},{status:400});const s=getSupabase();const {data,error}=await s.from('projects').insert({name}).select().single();if(error)throw error;return NextResponse.json(data)}catch(e:any){return NextResponse.json({error:e.message},{status:500})}}
