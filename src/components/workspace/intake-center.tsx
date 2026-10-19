"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Item, defaultData, categories } from "@/lib/workspace/model";
import { type Claim, type IntakeJob, safeIntakeReply } from "@/lib/intake/model";
import { money } from "@/lib/workspace/presentation";
type Snapshot = {enabled:boolean;jobs:IntakeJob[];claims:Claim[];used:number;limit:number;queued:number;estimatedUsd:number};
const statusLabels={queued:"Wartet auf Analyse",running:"Wird analysiert",done:"Analysiert · zur Prüfung",failed:"Manuell prüfen",paused:"Kostenlimit · pausiert",skipped:"Ausgelassen · ohne KI-Analyse"};
const claimLabels={review:"Prüfen · nicht bestätigt",open:"Offen bestätigt",disputed:"Strittig",paid:"Bezahlt / erledigt bestätigt",duplicate:"Doppelt / nicht übernehmen"};
export function IntakeCenter({items,expanded,onChanged,onDraft}:{items:Item[];expanded:boolean;onChanged:()=>Promise<void>;onDraft:(kind:"email"|"letter",defaults:Record<string,unknown>)=>void}){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [selected,setSelected]=useState("");
  const [profileId,setProfileId]=useState("");
  const [caseId,setCaseId]=useState("");
  const [personFilter,setPersonFilter]=useState("all");
  const [categoryFilter,setCategoryFilter]=useState("all");
  const changed=useRef(onChanged);changed.current=onChanged;
  const mounted=useRef(true);
  const processing=useRef(false);
  const request=useCallback(async(body?:Record<string,unknown>)=>{
    const r=await fetch("/api/workspace/intake",body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});
    const p=await r.json();if(!r.ok)throw new Error(p.error||"Eingangsagent nicht erreichbar.");return p;
  },[]);
  const reload=useCallback(async()=>{const p=await request();if(mounted.current)setSnapshot(p);return p as Snapshot;},[request]);
  useEffect(()=>{mounted.current=true;void reload().catch(e=>setError(e.message));return()=>{mounted.current=false;};},[reload]);
  useEffect(()=>{
    if(!snapshot?.enabled)return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    async function pump(){
      if(cancelled)return;
      if(!processing.current){
        processing.current=true;
        try{
          const state=await reload();
          if(state.enabled&&state.queued>0&&state.used<state.limit){
            await request({action:"process"});
            await reload();await changed.current();
          }
        }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Analyse unterbrochen.");}
        finally{processing.current=false;}
      }
      if(!cancelled)timer=setTimeout(pump,8000);
    }
    void pump();return()=>{cancelled=true;clearTimeout(timer);};
  },[snapshot?.enabled,reload,request]);
  async function mutate(body:Record<string,unknown>){
    setBusy(true);setError("");try{await request(body);await reload();await changed.current();}catch(e){setError(e instanceof Error?e.message:"Speichern fehlgeschlagen.");}finally{setBusy(false);}
  }
  async function backfill(){
    setSyncing(true);setError("");
    try{
      let before:number|undefined;
      do {const p=await request({action:"backfill",...(before?{before}:{})});before=p.next||undefined;await reload();}while(before&&mounted.current);
      await changed.current();
    }catch(e){setError(e instanceof Error?e.message:"Import unterbrochen. Bereits erfasste Eingänge bleiben erhalten.");}
    finally{setSyncing(false);}
  }
  const jobs=snapshot?.jobs||[];
  const job=jobs.find(j=>j.id===selected);
  const profiles=items.filter(i=>i.kind==="profile");
  const cases=items.filter(i=>i.kind==="case"&&(!i.data.profileId||i.data.profileId===profileId));
  const openClaims=(snapshot?.claims||[]).filter(c=>!["paid","duplicate"].includes(c.status));
  const payable=openClaims.filter(c=>c.status==="open"&&c.direction==="payable"&&c.currency==="EUR").reduce((s,c)=>s+(c.amount_cents||0),0);
  const receivable=openClaims.filter(c=>c.status==="open"&&c.direction==="receivable"&&c.currency==="EUR").reduce((s,c)=>s+(c.amount_cents||0),0);
  function selectJob(j:IntakeJob){setSelected(j.id);setProfileId(j.profile_id||"");setCaseId(j.case_id||"");}
  function prepare(j:IntakeJob){
    if(!j.result)return;const body=safeIntakeReply(j.result);if(!body)return;
    if(j.source_kind==="mail"&&typeof j.source.replyTo==="string")onDraft("email",{...defaultData("email"),to:j.source.replyTo,subject:`Re: ${j.title}`,body,profileId:j.profile_id||"",caseId:j.case_id||"",sourceMailbox:"AOL",sourceMessageId:j.source.messageId||"",sourceRef:{folder:j.source.folder,uid:j.source.uid,validity:j.source.validity}});
    else onDraft("letter",{...defaultData("letter"),subject:j.title,body,profileId:j.profile_id||"",caseId:j.case_id||"",reference:j.result.reference});
  }
  return <section className="panel intake-center" aria-label="Eingangsagent">
    <div className="section-heading"><div><span className="eyebrow">Post · Upload · E-Mail</span><h2>Eingangsagent</h2></div><span className="badge">{snapshot?snapshot.enabled?"Automatische Analyse aktiv":"Automatische Analyse pausiert":"Verbindung wird geprüft …"}</span></div>
    {error&&<p className="notice" role="alert">{error}</p>}
    {snapshot&&<><p className="muted">{snapshot.used} / {snapshot.limit} Analysen diesen Monat · {snapshot.queued} Eingänge warten · bisherige Tokenkosten etwa {snapshot.estimatedUsd.toLocaleString("de-DE",{style:"currency",currency:"USD",minimumFractionDigits:3})}. Maximal 30.000 Eingabe- und 3.000 Ausgabetokens pro Analyse. Keine automatische Wiederholung oder Bezahlung.</p>
    <details open={expanded}>
      <summary>Analyse, Ablage und Forderungen anzeigen</summary>
      <p>Neue und vorhandene Briefe, Scans, PDFs und E-Mails werden über OpenAI geprüft. Originale bleiben erhalten. Sichere Zuordnungen werden vorgeschlagen; unklare Personen und rechtliche Fragen bleiben zur Prüfung offen. Dieser Agent ersetzt keine rechtliche Prüfung.</p>
      <div className="toolbar"><label><input type="checkbox" checked={snapshot.enabled} disabled={busy} onChange={e=>mutate({action:"settings",enabled:e.target.checked})}/> Automatisch über OpenAI analysieren – auch enthaltene Gesundheits-, Rechts- und Finanzdaten</label>
      <button className="quiet-button" disabled={syncing||!snapshot.enabled} onClick={backfill}>{syncing?"Vorhandene Eingänge werden erfasst …":"Alle vorhandenen Dokumente & AOL-Eingänge erfassen"}</button><button className="quiet-button" disabled={busy||!snapshot.enabled} onClick={()=>mutate({action:"process"})}>Nächste Eingänge prüfen</button><button className="quiet-button" disabled={busy} onClick={()=>void reload().catch(e=>setError(e.message))}>Aktualisieren</button></div>
      <h3>Forderungen & Zahlungen · vom Agenten erkannt</h3>
      <p>Bestätigte Zahlungsverpflichtungen: <strong>{money(payable)}</strong> · Bestätigte Erstattungen / Ansprüche: <strong>{money(receivable)}</strong></p>
      <p className="muted">„Prüfen“ und „Strittig“ werden nicht als bestätigte Schulden summiert. Ein Zahlungsbeleg setzt keinen Eintrag automatisch auf bezahlt. Fremdwährungen und unklare Beträge bleiben separat.</p>
      {!snapshot.claims.length&&<p>Noch keine Forderung erkannt. Nicht analysierte Eingänge finden Sie darunter.</p>}
      <div className="intake-claims">{snapshot.claims.map(c=><article className="intake-record" key={c.id}>
        <strong>{c.creditor||c.title}</strong><p>{c.amount_cents===null?"Betrag unklar":`${(c.amount_cents/100).toLocaleString("de-DE",{minimumFractionDigits:2})} ${c.currency}`} · {c.direction==="payable"?"Zahlung an Gläubiger":c.direction==="receivable"?"Erstattung / Anspruch":"Zahlungsrichtung prüfen"} · {claimLabels[c.status]}</p>
        <p>{c.reference?`Aktenzeichen: ${c.reference} · `:""}{c.due?`Genannte Frist: ${c.due}${c.due < new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"}) ? " · Datum liegt in der Vergangenheit – dringend prüfen" : ""}`:"Keine eindeutige Zahlungsfrist"} · {profiles.find(p=>p.id===c.profile_id)?.title||"Person ungeklärt"}</p>
        <blockquote>{c.evidence}{c.page?` (Seite ${c.page})`:""}</blockquote>
        <div className="toolbar"><select aria-label={`Stand der Forderung ${c.creditor||c.title}`} disabled={busy} value={c.status} onChange={e=>mutate({action:"claim",id:c.id,status:e.target.value,profileId:c.profile_id||"",caseId:c.case_id||""})}>{Object.entries(claimLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <button className="quiet-button" onClick={()=>{const source=jobs.find(j=>j.id===c.job_id);if(source)selectJob(source);}}>Quelle & Empfehlung</button></div>
      </article>)}</div>
      <h3>Eingänge & Ablage</h3>
      <p className="muted">Benennung: JJJJ-MM-TT_Bezeichnung. Fehlendes Dokumentdatum: Datum-offen. Bis zu 200 zuletzt aktualisierte Vorgänge werden hier angezeigt; die Warteschlange wird innerhalb des Monatslimits abgearbeitet.</p>
      <div className="toolbar"><label>Ablage nach Person<select value={personFilter} onChange={e=>setPersonFilter(e.target.value)}><option value="all">Alle Personen</option><option value="unassigned">Zuordnung offen</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Ordner / Kategorie<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">Alle Ordner</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div>
      <div className="intake-jobs">{jobs.filter(j=>(personFilter==="all"||(personFilter==="unassigned"?!j.profile_id:j.profile_id===personFilter))&&(categoryFilter==="all"||j.result?.category===categoryFilter)).map(j=><button className="quiet-button" key={j.id} aria-pressed={j.id===selected} onClick={()=>selectJob(j)}>{j.title} · {statusLabels[j.status]}{j.result?.legalReview?" · Fachliche Rechtsprüfung nötig":""}{j.result?.urgency==="urgent"?" · DRINGEND":""}</button>)}</div>
      {job&&<article className="intake-record"><h3>{job.title}</h3><p>{statusLabels[job.status]}</p>{job.error&&<p role="alert">{job.error}</p>}{job.status==="done"&&<button className="quiet-button" disabled={busy} onClick={()=>mutate({action:"reapply",id:job.id})}>Gespeichertes Ergebnis erneut zuordnen</button>}{job.result&&<><p>{job.result.summary}</p><p><strong>Nächster Schritt:</strong> {job.result.recommendation}</p>{job.result.legalReview&&<p className="notice">Rechtliche Prüfung erforderlich. Der Agent erstellt hier keinen vermeintlich rechtssicheren Widerspruch und keine fristwahrende Erklärung.</p>}
        <p>Kategorie / Ablage: {job.result.category} · {job.result.documentDate||"Dokumentdatum ungeklärt"}</p>{job.result.dateEvidence&&<blockquote>Datum: {job.result.dateEvidence}</blockquote>}{job.result.recipientEvidence&&<blockquote>Empfänger: {job.result.recipientEvidence}</blockquote>}
        <ul>{job.result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
        <div className="toolbar"><label>Person<select aria-label="Person für diesen Eingang" value={profileId} onChange={e=>{setProfileId(e.target.value);setCaseId("");}}><option value="">Ungeklärt</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Akte<select aria-label="Akte für diesen Eingang" value={caseId} onChange={e=>setCaseId(e.target.value)}><option value="">Keine Akte</option>{cases.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><button className="quiet-button" disabled={busy} onClick={()=>mutate({action:"assign",id:job.id,profileId,caseId})}>Zuordnung speichern</button></div>
        {safeIntakeReply(job.result)&&<button className="quiet-button" onClick={()=>prepare(job)}>Professionellen Entwurf zur Prüfung vorbereiten</button>}
        {job.source_kind==="document"&&<button className="quiet-button" onClick={()=>{const original=items.find(i=>i.id===job.source_id);if(original)window.location.href=`/bereich?view=documents&profile=${original.data.profileId||""}`;}}>Zum Dokumentbereich</button>}
      </>}</article>}
    </details></>}
  </section>;
}
