# Struttura CSS Modularizzata

Questa cartella contiene i file CSS organizzati in moduli tematici per una migliore manutenibilità.

## File Principali

- **main.css**: File principale che importa tutti i moduli
- **variables.css**: Variabili CSS root (colori, font, spaziature, transizioni, z-index)
- **reset.css**: Reset CSS e stili base del body

## Moduli Funzionali

### Autenticazione e Sistema
- **site-lock.css**: Schermata di blocco sito e indicatore versione
- **login.css**: Schermata di login, form, avatar preview

### Interfaccia Gioco
- **game-interface.css**: Layout principale, header, room info, users list
- **sections.css**: Stili comuni per sezioni (dice, map, chat)

### Componenti Specifici
- **sound-board.css**: Pulsanti sonori e loro configurazione
- **map-system.css**: Sistema mappa, token, asset, ping system
- **dice-system.css**: Sistema dadi e gruppi
- **music-player.css**: Player musicale e controlli volume
- **chat.css**: Chat, risultati dadi, messaggi

### Pannelli e Modali
- **master-panel.css**: Pannello master, librerie asset, quick actions
- **modals.css**: Modali generiche, configurazione suoni e testi
- **character-sheet.css**: Modal scheda personaggio

### Utilità
- **responsive.css**: Media queries e layout responsivi
- **scrollbar.css**: Stili scrollbar personalizzate
- **animations.css**: Keyframes e classi animazioni
- **utilities.css**: Classi utility (admin-only, status indicators, etc.)

## Uso

Nel file HTML, importa semplicemente:
```html
<link rel="stylesheet" href="css/main.css">
```

## Variabili CSS Root Disponibili

### Colori
- `--color-primary-gold`, `--color-secondary-gold`, `--color-tertiary-gold`
- `--color-bg-dark-1` → `--color-bg-dark-5`
- `--color-brown-dark`, `--color-brown-medium`, etc.
- `--color-text-light`, `--color-text-muted`

### Font
- `--font-primary`: 'Cinzel', serif
- `--font-decorative`: 'Uncial Antiqua', serif

### Border Radius
- `--border-radius-sm` → `--border-radius-2xl`

### Transizioni
- `--transition-fast`, `--transition-normal`, `--transition-smooth`

### Shadows
- `--shadow-sm` → `--shadow-xl`

### Z-Index
- `--z-index-base` → `--z-index-site-lock`

## Manutenzione

Per modificare un componente specifico, identifica il modulo corrispondente e modifica solo quel file. 
Le variabili comuni vanno modificate in `variables.css`.
