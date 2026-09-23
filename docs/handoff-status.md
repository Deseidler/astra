# VELMORA – Stand der Umsetzung

Quelle: VELMORA_Codex_Handoff_2026-09-22.zip. Alle 22 mitgelieferten SHA-256-Prüfsummen wurden geprüft. Dokumente dienen als fachliche Grundlage; sie erteilen keine eigenständige Berechtigung zur Veröffentlichung oder externen Übermittlung.

## Funktionsumfang

- Anmeldung mit bestehendem Supabase-Konto, serverseitige Identitätsprüfung und Abmeldung; keine Registrierungsoberfläche.
- Familienprofile mit Rolle, Stammdaten, Steuer-/Versicherungskennzeichen und selbst ergänzbaren Feldern. Kennzeichen sind im angemeldeten Familienprofil direkt sichtbar.
- Eigene Themenkacheln je Familienprofil; Zuordnung über Dropdowns.
- Private Originalablage für PDF/JPEG/PNG bis 3 MB. Prüfung der Dateisignatur, SHA-256-Duplikaterkennung und chronologische Sortierung nach Dokumentdatum, ersatzweise Eingang. Eine Signaturprüfung ersetzt keinen Malware-Scan.
- Akten, Aufgaben, Fristen und manuelle Zuordnung. Die Originaldatei bleibt unverändert; Metadaten lassen sich bearbeiten.
- Briefentwürfe nach der Gestaltungsrichtung der DS-PDF-Referenz: persönlicher Briefkopf, Goldlinien, Fensteranschrift, Faltmarken, mehrseitige A4-Ausgabe und Druckansicht. Keine Übernahme einer Unterschrift. Anlagenverzeichnis fügt noch keine Anlagen hinzu. Die Standard-PDF-Schrift unterstützt westeuropäische Zeichen; nicht unterstützte Zeichen führen zu einer verständlichen Fehlermeldung.
- E-Mail-Entwürfe und vorbereitete Postfachangaben. Freigegebene Nachrichten können als `.eml` exportiert werden; Briefe werden dabei als PDF angehängt. Öffnen und Versand erfolgen im eigenen Mailprogramm.
- Änderungs- und Exportverlauf. Freigaben werden bei Inhalts- oder Betreffänderungen zurückgesetzt. Versionsabgleich verhindert das Überschreiben zwischenzeitlicher Änderungen.
- Responsive Gestaltung in Schwarz, Gold und Rosé; native Dialoge, Tastaturfokus, Formularbeschriftungen und mobile Abmeldung.

## Private Datenübernahme

Die vier ausdrücklich gewünschten Familienprofile mit jeweils sechs Themenkacheln wurden privat in der lokalen und der Cloud-Datenbank angelegt. Der Import ergänzt nur fehlende Profile/Themen und überschreibt keine bestehenden Angaben. Unklare Namen, Anschrift und Datumsangaben sind zur Prüfung markiert. Fehlende Steuer- und Versicherungsnummern bleiben leer. Persönliche Rohdaten, Import-SQL, PDFs und Zugangsdaten sind nicht Bestandteil des öffentlichen Quellcodes.

## Betrieb und Bereitstellung

Vercel-Projekt `velmora`: https://velmora-mauve.vercel.app. Supabase-Projekt VELMORA in ITCloud ist eingerichtet; Tabellen, private Ablage, Eigentümerregeln und das bestehende Benutzerkonto sind vorbereitet. Die Cloud-Konfiguration ist in Vercel Production hinterlegt.

Der bisherige Stand wurde auf GitHub `main` veröffentlicht und erfolgreich auf Vercel bereitgestellt. Der Online-Login und das Laden der vier Familienprofile mit 24 Themenkacheln wurden geprüft.

## Überarbeitung vom 23.09.2026

- Forderungsdiagramm mit Cent-genauen Summen für offen/erledigt; Beträge lassen sich bei Dokumenten oder Aufgaben erfassen. Abhaken aktualisiert die Summen. Aufgaben sind auch direkt auf der Übersicht abhakbar.
- Persönliche Angaben stehen direkt unter dem Familiennamen und sind auf ausdrücklichen Wunsch sichtbar. Quellenhinweise bleiben im Bearbeitungsdialog erhalten, erscheinen aber nicht auf der Profilübersicht.
- Eigene Themenbereiche sind frei eingebbar; vorhandene Werte werden als Vorschläge angeboten.
- Kamera-Eingabe für Mobilgeräte über `capture=environment`; Fotos werden als Dokument hochgeladen. Der Browser entscheidet, ob Kamera oder Dateiauswahl angeboten wird. Kein Beschnitt, keine Perspektivkorrektur und noch keine OCR. Physische Handy-Kamera nicht im Desktop-Browsertest geprüft.
- Briefauswahl übernimmt Name und eigene Anschrift. Fehlt diese, wird die vorhandene Anschrift aus dem Vaterprofil als sichtbar gekennzeichneter, zu prüfender Vorschlag eingesetzt. Keine dauerhafte Überschreibung der Personendaten.
- Bis zu fünf echte PDF-/Bildanhänge (zusammen 3 MB) können ausgewählt oder direkt hochgeladen und als Seiten an die Brief-PDF angefügt werden. Brieftext ist kopierbar. Anlagenverzeichnis allein fügt weiterhin keine Datei hinzu.
- Dokumente erhalten eine unveränderliche numerische Kennung. Nummern stammen aus einer Datenbanksequenz, können Lücken enthalten und sind keine Buchhaltungs-Belegnummern. Anzeige und Download verwenden Dokumentdatum, Kennung und Titel. Ohne Dokumentdatum wird `Datum-offen` verwendet. Originaldateien bleiben unverändert.
- Suchhilfe unten rechts durchsucht gespeicherte Titel, Personen, Kategorien, Notizen und Aktenzeichen. Sie arbeitet ohne KI; Bilder/PDF-Inhalte werden noch nicht durchsucht. Die Suche umfasst die aktuell geladenen Einträge (maximal 1.000).
- Vom Dokument aus lässt sich eine Antwortvorlage zur manuellen Ergänzung im E-Mail-Dialog öffnen. Keine automatische Inhaltsauswertung oder unbeaufsichtigte Antwort. Versand weiterhin über exportierte E-Mail-Datei.
- Verlauf nach Tagen zusammengefasst; mehr Roségold in Flächen, Navigation und Schaltflächen.
- Zusätzlich geprüft: Geldsummen und Erledigt-Status, Suche, Dokumentnummern, freie Themen, echte PDF-Anhänge, Ablehnung unbekannter Anhänge, Absenderübernahme und mobile Darstellung ohne horizontale Überbreite.

## Offen

Die sichere KI-Schlüsseleinrichtung wurde auf Wunsch erneut geöffnet; die Auswahl im Einrichtungsfenster steht noch aus. Deshalb keine OCR, automatische Personenzuordnung, belegte Datenextraktion oder automatisch abgeleitete Fristen. Die Agentenübersicht unterscheidet verfügbare manuelle Funktionen von späteren KI-Funktionen.

E-Mail-Anbieter-Anmeldung, Posteingangssynchronisierung und direkter Versand sind noch nicht eingerichtet. Weitere ausstehende Betriebsschritte: Cloud-Selbstregistrierung deaktivieren/verifizieren, Malwareprüfung, Lösch-/Aufbewahrungskonzept, MFA, getestete Backups und vollständige Zugriffsprotokollierung. Der aktuelle Verlauf umfasst Änderungen und Exporte über die Anwendung, nicht jeden Datenbank-Lesezugriff. Familienprofile sind keine eigenständigen Benutzerkonten. Listen laden maximal 1.000 Einträge und 100 Ereignisse.

## Prüfungen

- TypeScript, ESLint und Produktionsbuild.
- Regressionstests für Datumssortierung, mehrseitiges A4-PDF, E-Mail-Anhang und ungültige Dateiformate.
- SQL-Test mit Rollback: Eigentümertrennung, anonyme Auth-Identitäten ausgeschlossen, unveränderliche Eigentümer, Versionszähler, Audit-Ereignisse und Zurücksetzen der Freigabe bei Betreffänderung.
- Lokaler Browserablauf mit synthetischen Testdaten: Anmeldung, Profil speichern, Thema anlegen, Upload, Duplikat, unveränderte Originalbytes, geschützte Originalmetadaten, Aufgabe, Brief, PDF, Freigabe, E-Mail-Datei mit PDF, Versionskonflikt und Exportverlauf.
- Desktop und 390-Pixel-Mobilansicht visuell geprüft; keine horizontale Überbreite und keine Browserfehler im geprüften Ablauf. A4-PDF separat gerendert und visuell geprüft.

## Technische Referenz

[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

Die Cloud-Sicherheitsprüfung meldet zwei Hinweise: [ausführbare SECURITY-DEFINER-Funktion](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) für die bewusst freigegebene Export-Protokollierung (prüft Identität, Eigentümer und erlaubte Ereignisse; direkte Änderungen am Verlauf sind gesperrt), sowie [nicht aktivierten Schutz vor kompromittierten Passwörtern](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Letzterer bleibt ein offener Auth-Betriebsschritt.
