# Buff Timer Stream Deck Plugin

Dieses Plugin ist als **Anzeige-/Timer-Action** ausgelegt und bildet den Zyklus
**A → B → C → D(=zurück zu A)** auf einer Taste ab.

## Verhalten

- **A:** Statisches Idle-Icon (wartet auf Tastendruck)
- **Tastendruck in A/B/C:** Zyklus startet neu bei **B**
- **B:** Icon B statisch oder blinkend (1–3 Hz) für einstellbare Zeit
- **C:** Icon C statisch oder blinkend (1–3 Hz) für einstellbare Zeit
- Danach Rückkehr zu **A**

## Wichtig

Die Action sendet **keine Tastenkombination selbst**. Das ist absichtlich, damit keine
OS-/Permission-Probleme durch SendKeys entstehen.

Wenn du einen Hotkey brauchst, nutze in Stream Deck eine **Multi Action**:

1. **Hotkey**-Action (normale Stream-Deck-Aktion)
2. **Buff Timer Key** (diese Plugin-Action)

So übernimmt Stream Deck zuverlässig die Hotkey-Auslösung, und dieses Plugin macht nur die Statusanzeige/Timer-Logik.

## Struktur

```text
com.example.bufftimer.sdPlugin/
├── manifest.json
├── images/
├── plugin/index.js
└── propertyinspector/
```

## Konfiguration im Property Inspector

- Icon-Pfade für A/B/C
- Timer B/C in Sekunden
- Blinken B/C ein/aus
- Blinkfrequenzen B/C (1–3 Hz)
