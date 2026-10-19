import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, checkOrigin, workspaceAuth, HttpError } from "@/lib/workspace/server";
import { enqueueExisting, processIntakeJob } from "@/lib/intake/agent";
export const runtime = "nodejs";
export const maxDuration = 300;
const headers = {"Cache-Control":"private, no-store"};
export async function GET() {
  try {
    const {db,user}=await workspaceAuth();
    const [settings,jobs,claims,usage,queued] = await Promise.all([
      db.from("intake_settings").select("enabled").eq("owner_id",user.id).maybeSingle(),
      db.from("intake_jobs").select("*").eq("owner_id",user.id).order("updated_at",{ascending:false}).limit(200),
      db.from("financial_claims").select("*").eq("owner_id",user.id).order("due",{ascending:true}).limit(1000),
      db.from("ai_reservations").select("id,input_tokens,output_tokens",{count:"exact"}).eq("owner_id",user.id).gte("created_at",new Date().toISOString().slice(0,7)+"-01T00:00:00Z"),
      db.from("intake_jobs").select("id",{count:"exact",head:true}).eq("owner_id",user.id).in("status",["queued","paused"]),
    ]);
    if ([settings,jobs,claims,usage,queued].some(r=>r.error)) throw new HttpError(503,"Der Eingangsagent ist derzeit nicht erreichbar.");
    return NextResponse.json({enabled:settings.data?.enabled===true,jobs:(jobs.data||[]).map(j=>({...j,source:Object.fromEntries(Object.entries(j.source||{}).filter(([key])=>key!=="text"))})),claims:claims.data,used:usage.count||0,limit:100,queued:queued.count||0,estimatedUsd:(usage.data||[]).reduce((s,r)=>s+(r.input_tokens*0.4+r.output_tokens*1.6)/1000000,0)}, {headers});
  } catch(e){return apiError(e);}
}
const actionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("settings"),enabled:z.boolean()}),
  z.object({action:z.literal("backfill"),before:z.number().int().min(1).max(4294967295).optional()}),
  z.object({action:z.literal("process"),id:z.uuid().optional()}),
  z.object({action:z.literal("claim"),id:z.uuid(),status:z.enum(["review","open","disputed","paid","duplicate"]),profileId:z.union([z.literal(""),z.uuid()]),caseId:z.union([z.literal(""),z.uuid()])}),
  z.object({action:z.literal("reapply"),id:z.uuid()}),
  z.object({action:z.literal("assign"),id:z.uuid(),profileId:z.union([z.literal(""),z.uuid()]),caseId:z.union([z.literal(""),z.uuid()])}),
]);
export async function POST(request:Request){
  try{
    checkOrigin(request);
    const {db,user}=await workspaceAuth();
    const raw=await request.text(); if(raw.length>2000) throw new HttpError(413,"Die Anfrage ist zu groß.");
    let json:unknown;try{json=JSON.parse(raw);}catch{throw new HttpError(400,"Ungültige Anfrage.");}
    const input=actionSchema.parse(json);
    if(input.action==="settings"){
      const r=await db.from("intake_settings").upsert({owner_id:user.id,enabled:input.enabled,updated_at:new Date().toISOString()});if(r.error)throw r.error;
      return NextResponse.json({ok:true},{headers});
    }
    if(input.action==="backfill")return NextResponse.json(await enqueueExisting(db,user.id,input.before),{headers});
    if(input.action==="process"){
      const processed=[];
      for(let i=0;i<(input.id?1:3);i++){const next=await processIntakeJob(db,user.id,input.id);if(!next)break;processed.push(next);}
      return NextResponse.json({processed},{headers});
    }
    if(input.action==="reapply"){
      const r=await db.from("intake_jobs").update({status:"queued",error:"",updated_at:new Date().toISOString()}).eq("owner_id",user.id).eq("id",input.id).eq("status","done").not("result","is",null).select("id").maybeSingle();if(r.error||!r.data)throw new HttpError(400,"Nur vorhandene fertige Ergebnisse können erneut zugeordnet werden.");
      return NextResponse.json({ok:true},{headers});
    }
    for(const [id,kind] of [[input.profileId,"profile"],[input.caseId,"case"]]){
      if(!id)continue;
      const r=await db.from("workspace_items").select("kind,data").eq("id",id).eq("owner_id",user.id).maybeSingle();
      if(r.error||r.data?.kind!==kind)throw new HttpError(400,"Die gewählte Zuordnung ist nicht verfügbar.");
      if(kind==="case"&&r.data.data.profileId&&r.data.data.profileId!==input.profileId)throw new HttpError(400,"Diese Akte gehört zu einer anderen Person.");
    }
    if(input.action==="claim"){
      const r=await db.from("financial_claims").update({status:input.status,profile_id:input.profileId||null,case_id:input.caseId||null}).eq("id",input.id).eq("owner_id",user.id).select("id").maybeSingle();
      if(r.error)throw r.error;if(!r.data)throw new HttpError(404,"Forderung nicht gefunden.");
    }else{
      const r=await db.from("intake_jobs").select("source_kind,source_id").eq("id",input.id).eq("owner_id",user.id).single();if(r.error)throw new HttpError(404,"Eingang nicht gefunden.");
      if(r.data.source_kind==="document"){
        const old=await db.from("workspace_items").select("data,version").eq("id",r.data.source_id).eq("owner_id",user.id).single();if(old.error)throw old.error;
        const saved=await db.from("workspace_items").update({data:{...old.data.data,profileId:input.profileId,caseId:input.caseId}}).eq("id",r.data.source_id).eq("owner_id",user.id).eq("version",old.data.version).select("id").maybeSingle();if(saved.error||!saved.data)throw new HttpError(409,"Dokument wurde geändert. Bitte neu laden.");
      }
      const claims=await db.from("financial_claims").update({profile_id:input.profileId||null,case_id:input.caseId||null}).eq("owner_id",user.id).eq("job_id",input.id);if(claims.error)throw claims.error;
      const jobKey=await db.from("intake_jobs").select("source_key").eq("owner_id",user.id).eq("id",input.id).single();
      if(jobKey.data){
        const docs=await db.from("workspace_items").select("id,data,version").eq("owner_id",user.id).eq("kind","document").eq("data->>intakeSourceKey",jobKey.data.source_key);
        for(const doc of docs.data||[]){const result=await db.from("workspace_items").update({data:{...doc.data,profileId:input.profileId,caseId:input.caseId}}).eq("owner_id",user.id).eq("id",doc.id).eq("version",doc.version).select("id").maybeSingle();if(result.error||!result.data)throw new HttpError(409,"Ein Anhang wurde geändert. Bitte die Zuordnung erneut prüfen.");}
      }
      const saved=await db.from("intake_jobs").update({profile_id:input.profileId||null,case_id:input.caseId||null,updated_at:new Date().toISOString()}).eq("id",input.id).eq("owner_id",user.id);if(saved.error)throw saved.error;
    }
    return NextResponse.json({ok:true},{headers});
  }catch(e){return apiError(e);}
}
