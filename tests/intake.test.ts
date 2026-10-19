import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveAssignment,intakeTitle,claimFingerprint,safeIntakeReply,intakeResultSchema,type IntakeResult} from "../src/lib/intake/model";
import type {Item} from "../src/lib/workspace/model";
const result:IntakeResult={title:"Zahlungsaufforderung",documentDate:"2026-10-13",dateEvidence:"13.10.2026",category:"Finanzen & Steuern",recipientName:"Pia Seidler",recipientEvidence:"An Pia Seidler",reference:"AB-123",summary:"Eine Forderung wird erhoben.",readable:true,warnings:[],urgency:"normal",legalReview:false,recommendation:"Unterlagen prüfen.",responseNeeded:true,claims:[]};
const profile=(id:string,name:string)=>({id,kind:"profile",title:name,data:{name},owner_id:"owner",version:1,created_at:"2026-10-19",updated_at:"2026-10-19"} as Item);
test("intake naming uses document evidence and never fabricates a date",()=>{
 assert.equal(intakeTitle(result),"2026-10-13_Zahlungsaufforderung");
 assert.equal(intakeTitle({...result,dateEvidence:""}),"Datum-offen_Zahlungsaufforderung");
 assert.equal(intakeTitle({...result,title:"../Zahlung: Frage/Antwort"}).includes("/"),false);
 assert.equal(intakeResultSchema.safeParse({...result,documentDate:"2026-02-31"}).success,false);
});
test("assignment requires unique full recipient name and evidence; children and ambiguous profiles are not guessed",()=>{
 const items=[profile("pia","Pia Seidler"),profile("dom","Dominik Seidler")];
 assert.equal(resolveAssignment(result,items).profileId,"pia");
 assert.equal(resolveAssignment({...result,recipientName:"Pia",recipientEvidence:"Pia"},items).profileId,"");
 assert.equal(resolveAssignment({...result,recipientEvidence:"Familie Seidler"},items).profileId,"");
 assert.equal(resolveAssignment(result,[...items,profile("other","Pia Seidler")]).profileId,"");
});
test("claim deduplication uses creditor reference currency amount and direction, not merely equal amounts",()=>{
 const c={creditor:"Beispiel GmbH",reference:"AB-123",amountCents:12500,currency:"EUR",direction:"payable" as const,due:"",evidence:"Bitte zahlen Sie 125,00 EUR",page:1,state:"demanded" as const};
 assert.equal(claimFingerprint("mail:a",0,c),claimFingerprint("document:b",0,c));
 assert.notEqual(claimFingerprint("a",0,c),claimFingerprint("a",0,{...c,reference:"AB-124"}));
 assert.notEqual(claimFingerprint("a",0,{...c,reference:""}),claimFingerprint("b",0,{...c,reference:""}));
});
test("risky or unreadable sources cannot produce a purported legally effective reply",()=>{
 assert.equal(safeIntakeReply({...result,legalReview:true}),"");
 assert.equal(safeIntakeReply({...result,readable:false}),"");
 assert.equal(safeIntakeReply({...result,responseNeeded:false}),"");
 assert.match(safeIntakeReply(result),/Unterlagen/);
 assert.doesNotMatch(safeIntakeReply(result),/erkenne.*an|werde.*zahlen|fristwahrend/i);
});
