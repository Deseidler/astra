# AOL-Korrespondenz

Der Bereich **E-Mail** kann einen AOL-Posteingang seitenweise lesen (25 Nachrichten je Abruf), persönliche Nachrichten anzeigen und Antwortentwürfe im bestehenden Arbeitsbereich anlegen. Die bestehenden Eigentümerregeln, Versionsprüfung, Freigabe und EML-Ausgabe gelten weiter. Es gibt keinen SMTP-Versand und keinen automatischen Versand. Entwürfe werden in VELMORA gespeichert, nicht in den AOL-Entwürfe-Ordner synchronisiert.

## Einrichtung

Folgende Variablen gehören ausschließlich in die lokale ignorierte `.env.local` beziehungsweise in die serverseitige Vercel-Konfiguration der richtigen Umgebung:

| Variable | Zweck |
| --- | --- |
| `AOL_OWNER_ID` | Supabase-Auth-Benutzer-ID des ausdrücklich berechtigten Postfachinhabers; ohne exakte Übereinstimmung kein Zugriff |
| `AOL_EMAIL` | Vollständige AOL-Postfachadresse |
| `AOL_APP_PASSWORD` | Separates, vom Nutzer in AOL erzeugtes App-Passwort |
| `OPENAI_API_KEY` | Optional für Analyse und Antwortvorschläge |
| `OPENAI_MODEL` | Optional; Standard `gpt-4.1-mini`, Modellzugriff und API-Guthaben erforderlich |

Die bestehende Supabase-URL und der Publishable Key bleiben notwendig. Keine Service-Role-Schlüssel. Keine Zugangsdaten in Workspace-Notizen, Quellcode, Issues oder Pull Requests speichern. Die aktuelle Umsetzung unterstützt genau ein serverseitig konfiguriertes AOL-Konto mit expliziter Benutzerbindung. Für mehrere Postfachinhaber ist eine separate verschlüsselte Credential-Verwaltung erforderlich.

Der Nutzer erzeugt das App-Passwort direkt in AOL. Die Verbindung nutzt ausschließlich `imap.aol.com:993` mit TLS und aktivierter Zertifikatsprüfung. Ein Browser-Login in AOL stellt der Anwendung noch keine IMAP-Anmeldung zur Verfügung.

## Verhalten

- Nur `INBOX` und der erkannte Gesendet-Ordner werden gelesen. Nachrichten werden nicht als gelesen oder beantwortet markiert; keine Lösch- oder Verschiebeaktionen.
- Die Vorauswahl nutzt Listen-/Automatik-/Spam-Header und konservative Betreffregeln für Rechnungen und Belege. Sie ist keine vollständige Spam-Erkennung. Unklare Nachrichten bleiben sichtbar und ausgeblendete lassen sich zur Kontrolle anzeigen. Versteckte Nachrichten zählen zur geladenen Seite; für weitere persönliche Nachrichten gegebenenfalls ältere Seiten laden.
- Originalinhalte erscheinen als reiner Text, ohne aktive HTML-Inhalte, externe Bilder oder Links. Einzelne Nachrichten über 2 MiB müssen direkt in AOL gelesen werden. Texte sind auf 30.000 Zeichen begrenzt; Anhanginhalte werden nicht ausgewertet. Die Anzeige von Anhangnamen behauptet nicht, dass Dateien an eine Antwort angehängt werden.
- Vor der KI-Analyse wird die Zustimmung zur Übermittlung der angezeigten Nachricht und ihrer Metadaten an OpenAI verlangt. Der Server liest die Nachricht erneut aus dem berechtigten Postfach und ignoriert clientseitig gelieferte Inhalte. API-Antworten werden nicht gecacht; OpenAI-Aufrufe verwenden `store: false`. Das ersetzt keine vertragliche Prüfung der Datenverarbeitung.
- Der KI-Aufruf erhält keine Werkzeuge und keine anderen Familienunterlagen. Nachrichten sind ausdrücklich unzuverlässige Eingabedaten. Das Ergebnis wird gegen ein begrenztes Schema geprüft; ausgeschlossene oder unklare Nachrichten erhalten keinen verwendbaren Antworttext.
- Der Antwortstatus berücksichtigt `\\Answered` sowie bis zu zehn anhand `In-Reply-To`/`References` erkannte Antworten im Gesendet-Ordner. Deren Inhalte werden nicht ausgewertet. Andere, umbenannte oder außerhalb von AOL gesendete Antworten können fehlen. Bei gefundenen Antworten wird kein neuer KI-Entwurf erstellt.
- Entwürfe werden erst nach manueller Bearbeitung gespeichert. Die vorhandene Freigabe bleibt vor dem EML-Export erforderlich. Der Export enthält bei gültiger Quell-ID `In-Reply-To`/`References`. Empfänger, Inhalt und tatsächliche Anhänge müssen vor Versand im eigenen Mailprogramm geprüft werden.

## Prüfung und offene Aktivierung

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` prüfen die lokale Umsetzung. Die E-Mail-Ansicht wurde zusätzlich in einem isolierten lokalen Browser-Test mit simulierten API-Antworten geprüft (Vorauswahl, Einwilligung, Analyseanzeige, Übergabe an die Entwurfsbearbeitung). Dieser Test belegt keinen echten AOL-/OpenAI-/Datenbank-Durchlauf. Tests verwenden synthetische Nachrichten und überprüfen Filtergrenzen, Zugriffstrennung, Nachrichtenreferenzen und MIME-Export. Ein echter AOL-IMAP-Test und ein angemeldeter Browserablauf sind erst nach Postfachkonfiguration möglich.

Der neue lokale OpenAI-Schlüssel wurde sicher gespeichert, aber ein synthetischer API-Verbindungstest meldete `429 credit_balance_exhausted`. Keine privaten E-Mails wurden dabei übermittelt. Für KI-Funktionen muss zunächst API-Guthaben verfügbar sein. Das Vercel-Projekt war über die verbundene Vercel-Verbindung nicht sichtbar, wurde aber über die bereits angemeldete Vercel-CLI im Scope `dominik-seidler` eindeutig als `velmora` mit der bekannten Produktionsdomain gefunden. Diese Änderungen wurden noch nicht produktiv bereitgestellt.

Quellen: [AOL IMAP-Einrichtung](https://help.aol.com/articles/how-do-i-use-other-email-applications-to-send-and-receive-my-aol-mail), [AOL App-Passwörter](https://help.aol.com/articles/create-and-manage-app-password), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [API-Abrechnung](https://platform.openai.com/settings/organization/billing).
