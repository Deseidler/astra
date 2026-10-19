# Velmora Eingangsagent

## Verhalten

Nach Aktivierung verarbeitet der Agent vorhandene und neue Dokumente sowie eingehende AOL-E-Mails. Foto/Scan von Papierpost, PNG, JPG und PDF bis 3 MB werden unterstützt; PDF höchstens 10 Seiten pro Eingang. Originaldateien bleiben unverändert. Die Anzeige/Exportbenennung lautet `JJJJ-MM-TT_Bezeichnung`, ohne erkennbares Dokumentdatum `Datum-offen_Bezeichnung`. Aus E-Mails werden lesbare PDF-/Bildanhänge separat im Dokumentbereich archiviert.

Automatische Zuordnung verlangt einen eindeutigen vollen Empfängernamen mit Belegstelle. Bestehende manuelle Person-/Aktenzuordnungen und Beträge bleiben erhalten. Unklare Zuordnungen verbleiben zur Prüfung. Ordner entsprechen den bestehenden Kategorien und Themen des Familienprofils. Neue Rechtsakten werden nicht geraten.

Forderungen werden mit Quelle, Betrag, Währung, Zahlungsrichtung, genannter Frist und Belegstelle als **Prüfen** gespeichert. Forderungen gegen den Empfänger und Erstattungen zugunsten des Empfängers bleiben getrennt. Kein Betrag wird allein durch KI-Erkennung zu einer bestätigten Schuld oder Zahlung. Gleiche eindeutige Gläubiger-/Aktenzeichen-/Betrag-/Währungs-/Richtungs-Kombinationen werden nicht erneut angelegt; unklare Duplikate benötigen menschliche Prüfung. Bereits manuell erfasste gleiche Dokumentbeträge werden nicht nochmals angelegt.

Rechtsrisiken werden markiert. Keine Paragraphen, Urteile oder rechtliche Wirksamkeit ohne externe Prüfung behaupten. Bei Mahnbescheid, Klage, Vollstreckung, Verjährung oder strittigen Beträgen wird kein vermeintlich rechtswirksamer Antwortentwurf erzeugt. Für unkritische Anfragen steht ein sachlicher neutraler Unterlagen-Anforderungstext zur manuellen Ergänzung bereit. Es gibt keinen automatischen Versand, keine Zahlung und keine automatische Anerkennung einer Forderung.

## Ausführung und Grenzen

Uploads werden dauerhaft in die Warteschlange aufgenommen und über Next.js `after` angestoßen. Bei geöffnetem Velmora-Bereich arbeitet der Client die Warteschlange weiter ab. **Es ist kein rund um die Uhr laufender Mailabruf eingerichtet.** Neue AOL-Post wird beim Laden des Posteingangs aufgenommen. Der Import vorhandener Eingänge liest alle Inbox-Seiten; Spam/Newsletter und Zugangscodes werden übersprungen. Der Bestand wird ausdrücklich über den Knopf im Eingangsagenten erfasst; bereits erfasste Quellen werden nicht dupliziert. Nach Schließen der Oberfläche kann ein laufender Upload-Auftrag enden; verbleibende Aufträge laufen beim nächsten Öffnen weiter. Nach einem Serverabbruch hängen gebliebene `running`-Einträge sind manuell zu prüfen und werden nicht automatisch erneut berechnet.

## Kosten

Das bestehende Responses-API-Muster mit `gpt-4.1-mini` bleibt erhalten. Kein zusätzlicher Agents-API-Sandboxdienst, kein kostenpflichtiges Web- oder Dateisuchwerkzeug. Input-Tokens werden vor Generierung gezählt; über 30.000 Tokens wird abgebrochen. Maximal 3.000 Ausgabetokens, keine automatischen API-Wiederholungen. Atomare, nicht durch Client-Schreibrechte löschbare Reservierungen begrenzen alle Eingangs- und Antwortanalysen gemeinsam auf 100 Anfragen pro Kalendermonat (UTC), einschließlich Fehlversuchen. Fertige Ergebnisse sind anhand des Quellschlüssels gecacht. Bereits bestehende, außerhalb dieser Funktionen erzeugte OpenAI-Nutzung fällt nicht unter diese App-Grenze.

Bei den am 19.10.2026 geprüften Standardpreisen (0,40 USD / 1 Mio. Eingabetokens, 1,60 USD / 1 Mio. Ausgabetokens) ergibt die Tokenobergrenze für 100 vollständige Generierungen rechnerisch höchstens ca. 1,68 USD Modellkosten vor Steuern. Dies ist keine Gesamtpreisgarantie für OpenAI, Supabase, Vercel oder geänderte Anbieterpreise. Die UI zeigt reservierte Anfragen und geschätzte tatsächlich gemeldete Tokenkosten. Quellen: https://developers.openai.com/api/docs/models/gpt-4.1-mini und https://developers.openai.com/api/docs/guides/file-inputs

## Daten und Zugriff

`intake_settings`, `intake_jobs`, `financial_claims`, `ai_reservations` haben eigentümerbezogene RLS und lehnen anonyme Benutzer ab. Öffentliche RPCs für die Kostenreservierung sind absichtlich `SECURITY DEFINER`, erlauben nur authentifizierte nicht-anonyme Benutzer, leiten den Eigentümer ausschließlich aus `auth.uid()` ab und besitzen einen leeren `search_path`. Clientrollen können Reservierungen weder direkt anlegen noch löschen. Der Sicherheitsadvisor meldet diese beiden absichtlich freigegebenen RPCs als Warnung; Zugriffs-/Kostenbegrenzungstests sind erforderlich. Bestehende Warnungen zu `record_workspace_access` und deaktiviertem Leaked-Password-Schutz sind davon unabhängig.

Für die Analyse werden Inhalte und minimale Profilnamen an OpenAI übertragen, mit `store: false`. Die vom Eigentümer bestätigte Aktivierung kann in der Oberfläche pausiert werden. API-Schlüssel bleiben ausschließlich auf dem Server. Ergebnisse und Finanzdaten bleiben im angemeldeten Konto. Als rechtliche Risikobeispiele wurden § 212 BGB (https://www.gesetze-im-internet.de/bgb/__212.html) und die mögliche Wirkung eines Anerkenntnisses berücksichtigt; der Agent führt keine konkrete Rechtsprüfung durch.

## Nach der Live-Prüfung

Explizite Rechtsbegriffe (unter anderem Kostenbescheid, Ordnungswidrigkeit, Inkasso und Mahnbescheid) erzwingen zusätzlich unabhängig vom Modellflag eine fachliche Rechtsprüfung. Eindeutige Empfängernamen dürfen einen optionalen zweiten Vornamen aus dem Familienprofil auslassen; bei Mehrdeutigkeit wird weiterhin nichts geraten. Sicherheits-/Zugangsmeldungen und klare Werbung oder reine Versandmeldungen werden bereits vor dem Abrufen/Übermitteln des Inhalts ausgelassen. Kleine eingebettete Signaturlogos werden nicht als Dokumente analysiert; größere inline Scans und echte PDF-/Bildanhänge bleiben auswertbar, höchstens zehn je Mail innerhalb der Tokenobergrenze.

Forderungsnachweis und erkannter Zahlungsbeleg sind getrennt sichtbar. Ein weiterer Zahlungsbeleg zu einer bereits erkannten Forderung kann als ergänzende Quelle gespeichert werden, ohne den manuell bestätigten Stand automatisch zu ändern. Höhere Priorität erhalten Dokumente, Forderungen, Rechtsfragen und Fristen. Ein gespeichertes fertiges Ergebnis kann erneut zur Ablage angewendet werden; dafür wird die KI-Antwort aus dem Cache verwendet. Pausierte Budget-Aufträge werden beim nächsten verfügbaren Monatskontingent erneut berücksichtigt.
