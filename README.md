# Buff Timer Stream Deck Plugin (Prototype)

Dieses Repository enthält ein Beispiel-Plugin für die Stream-Deck-Plugin-API (SDK v2), das den von dir beschriebenen Zyklus **A → B → C → D** abbildet:

- **A:** Statisches Icon, wartet auf Tastendruck.
- **Tastendruck in A/B/C:** Hotkey wird **einmalig** ausgelöst, Zyklus startet neu bei B.
- **B:** Icon B statisch oder blinkend (1–3 Hz) für konfigurierbare Zeit.
- **C:** Icon C statisch oder blinkend (1–3 Hz) für konfigurierbare Zeit.
- **D:** Rücksprung zu A.

## Struktur

```text
com.example.bufftimer.sdPlugin/
├── manifest.json
├── images/
├── plugin/index.js
└── propertyinspector/
```

## Wichtige Hinweise

1. Die Action ist für `Keypad` Controller hinterlegt (frei auf einer Taste platzierbar).
2. Hotkey-Senden erfolgt in diesem Prototyp über das optionale Node-Paket `node-key-sender`.
   - Falls nicht installiert, läuft die State-Logik trotzdem, aber es wird nur eine Warnung geloggt.
3. Icons sind über den Property Inspector als Pfad (z. B. `images/state-b.svg`) oder Data-URI konfigurierbar.

## Lokales Testen

- Plugin-Ordner als `.sdPlugin` Paket in den Stream-Deck-Plugin-Ordner legen.
- Optional im Plugin-Ordner Dependencies installieren:

```bash
npm install ws node-key-sender
```

(Die Datei `package.json` ist absichtlich nicht enthalten, weil die Zielumgebung je nach Setup native Host-Optionen verwenden kann.)

## Nächste sinnvolle Schritte

- Property Inspector auf `sdpi-components` umstellen (komfortablere UI mit Toggles/Slider).
- Optional Unterstützung für Dial-Feedback ergänzen (z. B. Timer-Restzeit).
- Für Windows/macOS robuste native Hotkey-Layer statt JS-Dependency integrieren.
