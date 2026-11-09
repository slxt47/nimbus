# Nimbus

Das Wetter für einen Ort (bis 09.11.2026 hieß die Seite „Wetter“). Der Name: Nimbus ist die Regenwolke, passend zur
Schwester-Seite [Zenit](https://time.slxt.org), die den Himmel selbst zeigt.

Wetter für einen Ort: jetzt, die nächsten 24 Stunden und 14 Tage im Voraus, im slxt-Design.
Live: **https://weather.slxt.org**

## Was die Seite zeigt

Aufgebaut wie die Wetter-App (Apple HIG: Hierarchie von oben nach unten, Module, progressive Offenlegung):

- **Oben, direkt auf dem Himmel:** Ort, Temperatur groß, Wetterlage mit Symbol, Höchst- und Tiefstwert.
- **24 Stunden:** ein Satz zur Lage („Klar bis 15 Uhr, ab 16 Uhr bewölkt.“), darunter Stunde, Symbol,
  Regenwahrscheinlichkeit ab 20 % und Temperatur, seitlich scrollbar. „Jetzt“ zeigt die aktuellen Werte.
- **14 Tage:** Wochentag, Symbol mit Regenwahrscheinlichkeit, Tiefst-/Höchstwert mit Balken über alle 14 Tage
  (Farbe nach Temperatur); heute mit Punkt für die aktuelle Temperatur. Jede Zeile klappt auf (Regenmenge, Wind
  und Böen, Sonnenauf-/-untergang, UV). Ab Tag 8 als „unsicherer“ abgetrennt.
- **Details als Kacheln:** Gefühlt, Wind, Niederschlag, Luftfeuchte, UV-Index, Sonnenauf- bzw. -untergang,
  Bewölkung, Luftdruck – je mit kurzer Erklärung.
- **Ort wählbar:** Standard Graz, Suche nach Städten oder „Mein Standort“. Die Wahl bleibt nur im Browser.
- Hell/Dunkel-Schalter wie auf allen slxt-Seiten (Standard dunkel), Sternenhimmel im Dunkeln.

## Woher die Daten kommen

| Was | Quelle |
|---|---|
| Wetter und Prognose | [Open-Meteo](https://open-meteo.com/) `forecast` mit `forecast_days=14`, `timezone=auto`. Open-Meteo wählt automatisch das passende Modell nationaler Wetterdienste (u. a. DWD, ECMWF, GFS). Frei, ohne Schlüssel, Lizenz CC BY 4.0 |
| Ortssuche | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) (GeoNames) |

Die Anfragen stellt der Browser selbst. Der Server liefert nur die Dateien aus und sieht keine Wetterdaten.

## Aktualisierung und Cache

- Alle 10 Minuten neu, außerdem sofort, wenn der Tab wieder sichtbar wird oder das Netz zurückkommt.
- Beim Neuladen kommen die Daten aus dem `localStorage` (Schlüssel `wetter:ort`, `wetter:daten` aus der Zeit vor dem neuen Namen; 10 Minuten gültig). Unten steht „Stand hh:mm“.
- Klappt das Laden nicht, zeigt die Seite eine Meldung mit „Nochmal versuchen“ und, wenn vorhanden, die letzten Daten.
- `nimbus.js` und `nimbus.css` tragen eine Version (`?v=`) und werden 1 Jahr gecacht. Nach Änderungen die Nummer in
  `index.html` hochzählen.

## Ausprobieren

| Parameter | Wirkung |
|---|---|
| `?ort=Wien` | anderer Ort (wird nicht gespeichert) |

## Barrierefreiheit

- Geprüft mit axe (WCAG 2.0 bis 2.2 AA) hell und dunkel bei 320, 390 und 1280 px: keine Fehler, kein seitliches Scrollen.
- Jede Stunde und jeder Tag hat einen vollständigen Satz für Screenreader („Montag, 10. November: Regen, 4 bis 13 Grad …“);
  Symbole und Balken sind ausgeblendet.
- Ort-Fenster: Fokus bleibt im Fenster, `Esc` schließt, Fokus geht zurück zum Knopf.
- „Bewegung reduzieren“, „Transparenz reduzieren“ und „Kontrast erhöhen“ werden beachtet.

## Aufbau

Keine Bibliotheken, kein Build:

| Datei | Inhalt |
|---|---|
| `index.html` | Seite, Ort-Fenster |
| `nimbus.js` | Daten laden, Cache, Symbole (eigene SVGs), Darstellung, Ortssuche |
| `nimbus.css` | Aussehen (Farben wie `slxt.css`, Glaskarten, hell/dunkel) |
| `himmel.js` | Sternenhimmel wie auf slxt.dev |
| `modus.js` | Hell/Dunkel-Schalter, nur über `~/bin/modus/verteilen.py` ändern |
| `logo.svg`, `logo-180.png` | Logo |

Betrieb: nginx-Container `nimbus` (`~/compose/nimbus`, 127.0.0.1:94, gehärtet, Rate-Limit pro Besucher, CSP nur für
Open-Meteo). Öffentlich über den Cloudflare-Tunnel, Einrichtung mit `sudo python3 ~/compose/nimbus/veroeffentlichen.py`.
