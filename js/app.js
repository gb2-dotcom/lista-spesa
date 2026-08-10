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

// Stacca l'ascoltatore della riga in modifica, se ce n'è una aperta. Va
// tenuto qui fuori perché la riga può sparire per vie che non passano
// dalla modifica stessa: una spunta, una cancellazione, un ridisegno.
let staccaModificaAperta = null;

// Butta via il click che sta per arrivare, prima che raggiunga chiunque.
//
// Serve quando un tocco chiude la riga in modifica: il ridisegno mette
// un elemento nuovo dove c'era il dito, e col tocco il bersaglio del
// click viene deciso al rilascio, quindi finirebbe su quell'elemento
// aprendo una modifica che nessuno ha chiesto. Annullare pointerdown non
// basta: sopprime gli eventi mouse di compatibilità, non questo click.
//
// In cattura, per arrivare prima di ogni gestore. Il timer copre il caso
// in cui il click non arrivi mai — il gesto diventa uno scorrimento — e
// senza di lui resterebbe in agguato sul primo tocco successivo.
function inghiottiIlProssimoClick() {
  const blocca = (e) => {
    e.stopPropagation();
    e.preventDefault();
    pulisci();
  };

  const pulisci = () => {
    clearTimeout(timer);
    document.removeEventListener('click', blocca, true);
  };

  const timer = setTimeout(pulisci, 400);
  document.addEventListener('click', blocca, true);
}

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

  // Il nome sta in uno span suo: la barratura e lo sbiadimento del
  // "preso" valgono per il testo, non per il bottone che lo contiene.
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
  // Una riga in modifica sparisce con il ridisegno: il suo ascoltatore
  // sul documento resterebbe attaccato a un campo non più nella pagina.
  staccaModificaAperta?.();
  staccaModificaAperta = null;

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
  if (!avevaIlFocus) {
    return;
  }

  const casella = document.querySelector(`[data-id="${id}"] input[type="checkbox"]`);
  casella?.focus();

  // Dentro una sezione chiusa la casella non è raggiungibile e il
  // focus() non fa niente: senza questo si finirebbe sul body. Il
  // titolo della sezione dice dove è andata a finire la voce.
  if (casella && document.activeElement !== casella) {
    sezioneCompletate.querySelector('summary')?.focus();
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

  const voceTornata = document.querySelector(`[data-id="${id}"] .voce`);
  if (voceTornata) {
    voceTornata.focus();
    return;
  }

  // La voce può non esserci più: svuotare il campo la elimina. Il
  // titolo dice dove si è finiti, invece di lasciare il focus sul body.
  titolo.focus();
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

  // Niente bottone "Salva": con un solo campo, Invio invia il form da
  // sé, e toccare altrove conclude comunque la modifica. Un bottone in
  // più direbbe che senza di lui il lavoro andrebbe perso, e non è vero.
  formModifica.append(campo);

  function scriviModifica() {
    const nuovoNome = campo.value.trim();
    const voci = leggiVoci();

    // Voce lasciata vuota: sparisce. È il modo più diretto per toglierla
    // e non obbliga a centrare la ✕.
    if (!nuovoNome) {
      clearTimeout(inTransito.get(id));
      inTransito.delete(id);
      salvaVoci(voci.filter((v) => v.id !== id));
      return;
    }

    const daModificare = voci.find((v) => v.id === id);
    if (daModificare) {
      daModificare.nome = nuovoNome;
      salvaVoci(voci);
    }
  }

  // Le vie d'uscita sono parecchie e possono accavallarsi: chiudendo si
  // toglie il campo dalla pagina, e togliere un campo col focus ne
  // provoca la perdita, che è a sua volta una via d'uscita. Senza questo
  // interruttore la seconda ripasserebbe sopra alla prima.
  let conclusa = false;

  function chiudi(salvando) {
    if (conclusa) {
      return;
    }
    conclusa = true;

    if (salvando) {
      scriviModifica();
    }
    tornaAllaRiga(id);
  }

  function chiudiSeFuori(e) {
    if (formModifica.contains(e.target)) {
      return;
    }

    // Il tocco che chiude la modifica si ferma qui: non deve anche
    // aprire la riga toccata o spuntarla. Con la tastiera aperta che
    // copre metà schermo si esce spesso mirando male, e l'intera riga
    // apre la modifica: senza questo si finirebbe a correggere una voce
    // che non si voleva nemmeno toccare.
    //
    // Solo dentro la lista: toccando il campo "Aggiungi" il click deve
    // passare, altrimenti non prenderebbe il focus.
    if (e.target.closest('#lista li, #lista-completate li')) {
      inghiottiIlProssimoClick();
    }

    chiudi(true);
  }

  formModifica.addEventListener('submit', (e) => {
    e.preventDefault();
    chiudi(true);
  });

  campo.addEventListener('keydown', (e) => {
    // Esc annulla: esce senza scrivere niente, nome di prima intatto.
    if (e.key === 'Escape') {
      chiudi(false);
    }
  });

  // La tastiera di iOS ha un tasto "Fine" tutto suo, nella barra sopra i
  // tasti: è parte del browser, non della pagina, e non produce nessun
  // tocco su cui agganciarsi. Senza questo il campo resterebbe aperto e
  // senza tastiera, una riga sola diversa da tutte le altre. Perdere il
  // focus è il segnale che vale in ogni caso, anche uscendo dall'app.
  campo.addEventListener('blur', () => chiudi(true));

  li.replaceChildren(formModifica);

  // pointerdown e non click: si deve chiudere appena il dito tocca
  // altrove, non al rilascio.
  staccaModificaAperta = () => {
    // Se la riga sparisce per un ridisegno altrui, la modifica è finita
    // comunque: senza segnarlo, la perdita di focus che ne consegue
    // farebbe ripartire il salvataggio su un campo già staccato.
    conclusa = true;
    document.removeEventListener('pointerdown', chiudiSeFuori);
  };
  document.addEventListener('pointerdown', chiudiSeFuori);

  campo.focus();

  // Cursore in fondo, testo non selezionato: la modifica serve quasi
  // sempre a precisare una voce già scritta ("latte" → "latte intero"),
  // non a riscriverla. Selezionando tutto, il primo tasto premuto
  // cancellerebbe la parola. La posizione va imposta: dopo focus() il
  // punto di partenza non è garantito uguale su tutti i browser.
  const fine = campo.value.length;
  campo.setSelectionRange(fine, fine);
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
  // In cima e non in fondo: la voce appena scritta compare subito sotto
  // al campo, dove si sta già guardando. In fondo a una lista lunga
  // finirebbe fuori dallo schermo, senza conferma di essere stata presa.
  voci.unshift({ id: nuovoId(), nome, preso: false });
  salvaVoci(voci);
  input.value = '';
  carica();

  // Col campo fisso in alto si può aggiungere anche stando in fondo alla
  // lista, ma la voce nuova nasce in cima: senza risalire resterebbe
  // fuori dallo schermo. Scorrere invece di saltare mostra che ci si è
  // spostati, e da dove. Chi ha chiesto meno movimento salta e basta.
  window.scrollTo({
    top: 0,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
  });
});

// Fissa gli id al primo avvio della nuova versione: da qui in poi ogni
// voce resta riconoscibile anche se la lista cambia sotto un timer.
salvaVoci(leggiVoci());
carica();
