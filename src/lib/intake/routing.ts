// Deterministic exclusions run before any message body is sent to OpenAI.
export function skipIntakeSubject(subject:string) {
  if (/passwor[dt]|einmalpasswort|one.time.password|verifizierungscode|verification.code|anmeldecode|sicherheitscode|security.code|du bist angemeldet|neue anmeldung|new sign.in|login.alert|account.*(?:security|sicherheit)|(?:reset|confirm|verify).*(?:password|login|email)|(?:password|login).*(?:reset|confirm|verify)/i.test(subject)) return "Zugangs- oder Sicherheitsmeldung: keine Übermittlung an die KI.";
  if (/prime.vorteil|audible.*gratis|cashback|bitte bewerten|bewerte|transaktion.*bewerten|kauf.*bewerten|erwartungen erfüllt|wie zufrieden|gehalt.*wettbewerbsfähig|dieser job etwas|einmal klicken.*sparen|dein shop für|joker.coupons|mid season sale|freundschaftswerbung/i.test(subject)) return "Werbung oder Bewertungsanfrage: keine Analyse nötig.";
  if (/versandbestätigung|versandankündigung|bestellbestätigung|bestellung.*(?:verschickt|versandt|geliefert)|(?:deine|ihr[e]?).*(?:sendung|paket).*(?:unterwegs|heute|auf dem weg|abholbereit|ablageort)|dpd paket|(?:bestellt|versendet|zustellung deiner bestellung):?/i.test(subject)) return "Reine Bestell- oder Versandmeldung: keine Forderungsanalyse nötig. Rechnungen werden separat geprüft.";
  return "";
}
export function intakePriority(subject:string,kind:string) {
  return kind==="document"?100:/mahnbescheid|vollstreck|klage|gericht|frist|forderung|mahnung|zahlungsaufforderung|widerspruch|kostenbescheid|diebstahl|mandatsanfrage/i.test(subject)?90:/rechnung|ratenzahlung|bezahlung nach|kostenübernahme|erstat|zahlung/i.test(subject)?60:30;
}

export function includeIntakeAttachment(a:{contentType:string;contentDisposition?:string;cid?:string;size:number}) {
 if(a.contentType==="application/pdf")return true;
 if(!["image/png","image/jpeg"].includes(a.contentType))return false;
 return !(a.contentDisposition==="inline"||a.cid)||a.size>30000;
}
