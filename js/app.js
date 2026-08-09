const form = document.getElementById('form-aggiungi');
const input = document.getElementById('input-voce');
const lista = document.getElementById('lista');
const listaCompletate = document.getElementById('lista-completate');
const sezioneCompletate = document.getElementById('sezione-completate');
const conteggioCompletate = document.getElementById('conteggio-completate');
const bottoneCancella = document.getElementById('cancella-completate');
const titolo = document.querySelector('h1');

const ATTESA_ARCHIVIAZIONE = 1000;
const ATTESA_CONFERMA = 4000;

// Voci spuntate da meno di un secondo: restano fra le attive finché il
// timer non scade, così la riga non sparisce da sotto il dito.
const inTransito = new Map();

let confermaCancellazione = false;
let timerConferma = null;

function nuovoId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function leggiVoci() {
  try {
    const dati = JSON.parse(localStorage.getItem('voci') || '[]');
    if (!Array.isArray(dati)) {
      return [];
    }

    // Le liste salvate dalle versioni precedenti sono elenchi di testi,
    // oppure oggetti senza id. Qui prendono la forma corrente, così le
    // installazioni già in uso non perdono la lista. La conversione è
    // ripetibile: si può eseguire a ogni lettura senza danni.
    return dati
      .map((voce) => (typeof voce === 'string' ? { nome: voce, preso: false } : voce))
      .filter((voce) => voce && typeof voce.nome === 'string')
      .map((voce) => ({
        id: typeof voce.id === 'string' ? voce.id : nuovoId(),
        nome: voce.nome,
        preso: voce.preso === true
      }));
  } catch (errore) {
    return [];
  }
}

function salvaVoci(voci) {
  try {
    localStorage.setItem('voci', JSON.stringify(voci));
  } catch (errore) {
    console.warn('Non è stato possibile salvare la lista', errore);
  }
}

function creaRiga(voce) {
  const li = document.createElement('li');
  li.dataset.id = voce.id;
  if (voce.preso) {
    li.classList.add('presa');
  }

  // Una casella vera, non un bottone travestito: lo screen reader
  // annuncia da sé se è selezionata, senza aria aggiuntivo.
  const casella = document.createElement('input');
  casella.type = 'checkbox';
  casella.checked = voce.preso;
  casella.setAttribute('aria-label', `Preso: ${voce.nome}`);
  casella.addEventListener('change', () => cambiaStato(voce.id, casella.checked, li));

  // La voce è un bottone, non testo inerte: così è raggiungibile da
  // tastiera e lo screen reader la annuncia come attivabile.
  const bottoneModifica = document.createElement('button');
  bottoneModifica.type = 'button';
  bottoneModifica.className = 'voce';
  bottoneModifica.setAttribute('aria-label', `Modifica ${voce.nome}`);
  bottoneModifica.addEventListener('click', () => apriModifica(voce.id));

  // Il nome sta in uno span suo: così la barratura del "preso" tocca
  // il testo e non anche la matita.
  const nome = document.createElement('span');
  nome.className = 'nome';
  nome.textContent = voce.nome;
  bottoneModifica.appendChild(nome);

  const bottoneRimuovi = document.createElement('button');
  bottoneRimuovi.type = 'button';
  bottoneRimuovi.textContent = '✕';
  bottoneRimuovi.setAttribute('aria-label', `Rimuovi ${voce.nome}`);
  bottoneRimuovi.addEventListener('click', () => rimuovi(voce.id));

  li.append(casella, bottoneModifica, bottoneRimuovi);
  return li;
}

function carica() {
  const voci = leggiVoci();
  lista.innerHTML = '';
  listaCompletate.innerHTML = '';

  voci.forEach((voce) => {
    const archiviata = voce.preso && !inTransito.has(voce.id);
    (archiviata ? listaCompletate : lista).appendChild(creaRiga(voce));
  });

  conteggioCompletate.textContent = listaCompletate.children.length;
  sezioneCompletate.hidden = listaCompletate.children.length === 0;
  annullaConferma();
}

function ridisegnaTenendoIlFocus(id, avevaIlFocus) {
  carica();
  if (avevaIlFocus) {
    document.querySelector(`[data-id="${id}"] input[type="checkbox"]`)?.focus();
  }
}

function cambiaStato(id, preso, li) {
  const voci = leggiVoci();
  const voce = voci.find((v) => v.id === id);
  if (!voce) {
    return;
  }

  voce.preso = preso;
  salvaVoci(voci);
  li.classList.toggle('presa', preso);

  clearTimeout(inTransito.get(id));
  inTransito.delete(id);

  if (!preso) {
    // Torna subito fra le attive: qui non c'è il rischio di far
    // sparire una riga sotto il dito, la riga ricompare più in alto.
    ridisegnaTenendoIlFocus(id, li.contains(document.activeElement));
    return;
  }

  inTransito.set(id, setTimeout(() => {
    inTransito.delete(id);
    ridisegnaTenendoIlFocus(id, li.contains(document.activeElement));
  }, ATTESA_ARCHIVIAZIONE));
}

function tornaAllaRiga(id) {
  carica();
  document.querySelector(`[data-id="${id}"] .voce`)?.focus();
}

function apriModifica(id) {
  // Ridisegna prima di aprire: chiude un'eventuale altra riga in modifica.
  carica();

  const li = document.querySelector(`[data-id="${id}"]`);
  const voce = leggiVoci().find((v) => v.id === id);
  if (!li || !voce) {
    return;
  }

  const formModifica = document.createElement('form');

  const campo = document.createElement('input');
  campo.type = 'text';
  campo.value = voce.nome;
  campo.setAttribute('aria-label', `Nuovo nome per ${voce.nome}`);

  const bottoneSalva = document.createElement('button');
  bottoneSalva.type = 'submit';
  bottoneSalva.textContent = 'Salva';

  formModifica.append(campo, bottoneSalva);

  formModifica.addEventListener('submit', (e) => {
    e.preventDefault();

    const nuovoNome = campo.value.trim();
    if (!nuovoNome) {
      campo.focus();
      return;
    }

    const voci = leggiVoci();
    const daModificare = voci.find((v) => v.id === id);
    if (daModificare) {
      daModificare.nome = nuovoNome;
      salvaVoci(voci);
    }
    tornaAllaRiga(id);
  });

  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tornaAllaRiga(id);
    }
  });

  li.replaceChildren(formModifica);
  campo.focus();
  campo.select();
}

function rimuovi(id) {
  clearTimeout(inTransito.get(id));
  inTransito.delete(id);

  salvaVoci(leggiVoci().filter((voce) => voce.id !== id));
  carica();
}

function annullaConferma() {
  clearTimeout(timerConferma);
  confermaCancellazione = false;
  bottoneCancella.textContent = 'Cancella le completate';
  bottoneCancella.classList.remove('conferma');
}

bottoneCancella.addEventListener('click', () => {
  if (!confermaCancellazione) {
    // Cancella molte voci in un colpo solo e non si può annullare:
    // il primo tocco chiede conferma, il secondo esegue.
    confermaCancellazione = true;
    bottoneCancella.textContent = 'Tocca di nuovo per cancellare';
    bottoneCancella.classList.add('conferma');
    timerConferma = setTimeout(annullaConferma, ATTESA_CONFERMA);
    return;
  }

  // Le voci ancora in transito sono spuntate ma stanno fra le attive:
  // non sono nella sezione che si sta svuotando, quindi restano.
  salvaVoci(leggiVoci().filter((voce) => !voce.preso || inTransito.has(voce.id)));
  carica();

  // Il bottone appena toccato è sparito con la sezione: senza questo il
  // focus finirebbe sul body.
  titolo.focus();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const nome = input.value.trim();
  if (!nome) {
    input.value = '';
    input.focus();
    return;
  }

  const voci = leggiVoci();
  voci.push({ id: nuovoId(), nome, preso: false });
  salvaVoci(voci);
  input.value = '';
  carica();
});

// Fissa gli id al primo avvio della nuova versione: da qui in poi ogni
// voce resta riconoscibile anche se la lista cambia sotto un timer.
salvaVoci(leggiVoci());
carica();
