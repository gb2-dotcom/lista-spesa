# Lista della spesa

PWA minimale per la lista della spesa: installabile sul telefono, funziona anche offline.

🔗 [gb2-dotcom.github.io/lista-spesa](https://gb2-dotcom.github.io/lista-spesa/) — pubblicata da GitHub Pages a ogni push su `main`.

Progetto personale di *vibe coding*: sviluppato in conversazione con un assistente AI (Claude), come esercizio pratico su PWA (limiti e potenzialità multipiattaforma, specie su iOS/Safari) e su Git/GitHub.

## Installazione

**iOS (Safari):** apri il link → icona Condividi → "Aggiungi a Home".

**Android (Chrome):** apri il link → menu ⋮ → "Aggiungi a schermata Home" (o tocca il banner "Installa app" se compare).

## Cosa fa

- Aggiunge voci in cima alla lista
- Le spunta invece di cancellarle; le prese finiscono in "Completate"
- Modifica al tocco, salvataggio automatico
- Funziona offline, installabile sulla home

## Tecnologia

Vanilla JS, nessuna dipendenza. Dati in `localStorage`. File: `index.html`, `css/style.css`, `js/app.js`, `js/registra-sw.js`, `service-worker.js`.

## Locale

```bash
python3 -m http.server 8000
```

Il service worker non gira aperto come file locale, serve HTTP.

**Cache doppia:** dopo una modifica può non bastare un ricaricamento. C'è la cache HTTP del browser (colpisce anche i file collegati) e quella del service worker (resta sulla versione vecchia finché `CACHE_NAME` non cambia). Se una modifica sembra non funzionare, prima di sospettare il codice: deregistrare il service worker e svuotare le cache da console.

## Rilascio

Push su `main` = pubblicato. **Ad ogni modifica va incrementato `CACHE_NAME`** in [`service-worker.js`](service-worker.js), altrimenti chi ha l'app installata resta sulla versione vecchia.
