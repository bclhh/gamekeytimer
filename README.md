# Buff Timer Stream Deck Plugin

Dieses Plugin bildet den gewünschten Zyklus **A → B → C → D(=zurück zu A)** für eine frei platzierbare Stream‑Deck‑Taste ab.

## Verhalten

- **A:** Statisches Idle‑Icon (wartet auf Tastendruck)
- **Tastendruck in A/B/C:**
  1) Hotkey wird einmalig ausgelöst
  2) Zyklus startet neu bei **B**
- **B:** Icon B statisch oder blinkend (1–3 Hz) für einstellbare Zeit
- **C:** Icon C statisch oder blinkend (1–3 Hz) für einstellbare Zeit
- Danach Rückkehr zu **A**

## Wichtigste Korrektur

Es werden **keine externen Node‑Pakete** benötigt. Dadurch startet das Plugin ohne `npm install` und vermeidet das gelbe Warnsymbol bei fehlenden Dependencies.

## Struktur

```text
com.example.bufftimer.sdPlugin/
├── manifest.json
├── images/
├── plugin/index.js
└── propertyinspector/
```

## Konfiguration im Property Inspector

- Hotkey (`CTRL+SHIFT+1` etc.)
- Icon-Pfade für A/B/C
- Timer B/C in Sekunden
- Blinken B/C ein/aus
- Blinkfrequenzen B/C (1–3 Hz)

## Hotkey-Hinweis

- **Windows:** SendKeys per PowerShell
- **macOS:** `osascript` / System Events
- **Linux:** aktuell nur Warn-Log (kein Key-Send implementiert)
