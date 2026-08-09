const form = document.getElementById('form-aggiungi');
const input = document.getElementById('input-voce');
const lista = document.getElementById('lista');

function leggiVoci() {
  try {
    const dati = JSON.parse(localStorage.getItem('voci') || '[]');
    if (!Array.isArray(dati)) {
      return [];
    }

    // Le liste salvate prima della spunta sono elenchi di testi.
    // Qui diventano oggetti, così le installazioni già in uso non
    // perdono la lista. La conversione avviene a ogni lettura: è
    // ripetibile senza danni e non serve riscrivere subito i dati.
    return dati
      .map((voce) => (typeof voce === 'string' ? { nome: voce, preso: false } : voce))
      .filter((voce) => voce && typeof voce.nome === 'string')
      .map((voce) => ({ nome: voce.nome, preso: voce.preso === true }));
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

function carica() {
  const voci = leggiVoci();
  lista.innerHTML = '';
  voci.forEach((voce, i) => {
    const li = document.createElement('li');
    if (voce.preso) {
      li.classList.add('presa');
    }

    // Una casella vera, non un bottone travestito: lo screen reader
    // annuncia da sé se è selezionata, senza aria aggiuntivo.
    const casella = document.createElement('input');
    casella.type = 'checkbox';
    casella.checked = voce.preso;
    casella.setAttribute('aria-label', `Preso: ${voce.nome}`);
    casella.addEventListener('change', () => cambiaStato(i, casella.checked, li));

    // La voce è un bottone, non testo inerte: così è raggiungibile da
    // tastiera e lo screen reader la annuncia come attivabile.
    const bottoneModifica = document.createElement('button');
    bottoneModifica.type = 'button';
    bottoneModifica.className = 'voce';
    bottoneModifica.setAttribute('aria-label', `Modifica ${voce.nome}`);

    // Il nome sta in uno span suo: così la barratura del "preso" tocca
    // il testo e non anche la matita.
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = voce.nome;
    bottoneModifica.appendChild(nome);
    bottoneModifica.addEventListener('click', () => apriModifica(i));

    const bottoneRimuovi = document.createElement('button');
    bottoneRimuovi.type = 'button';
    bottoneRimuovi.textContent = '✕';
    bottoneRimuovi.setAttribute('aria-label', `Rimuovi ${voce.nome}`);
    bottoneRimuovi.addEventListener('click', () => rimuovi(i));

    li.append(casella, bottoneModifica, bottoneRimuovi);
    lista.appendChild(li);
  });
}

function cambiaStato(indice, preso, li) {
  const voci = leggiVoci();
  voci[indice].preso = preso;
  salvaVoci(voci);

  // Aggiorna solo questa riga invece di ridisegnare la lista: così la
  // casella appena toccata non perde il focus.
  li.classList.toggle('presa', preso);
}

function tornaAllaRiga(indice) {
  carica();
  lista.children[indice]?.querySelector('.voce')?.focus();
}

function apriModifica(indice) {
  // Ridisegna prima di aprire: chiude un'eventuale altra riga in modifica.
  carica();

  const li = lista.children[indice];
  if (!li) {
    return;
  }

  const voce = leggiVoci()[indice];

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

    const nuovaVoce = campo.value.trim();
    if (!nuovaVoce) {
      campo.focus();
      return;
    }

    const voci = leggiVoci();
    voci[indice].nome = nuovaVoce;
    salvaVoci(voci);
    tornaAllaRiga(indice);
  });

  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tornaAllaRiga(indice);
    }
  });

  li.replaceChildren(formModifica);
  campo.focus();
  campo.select();
}

function rimuovi(indice) {
  const voci = leggiVoci();
  voci.splice(indice, 1);
  salvaVoci(voci);
  carica();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const voce = input.value.trim();
  if (!voce) {
    input.value = '';
    input.focus();
    return;
  }

  const voci = leggiVoci();
  voci.push({ nome: voce, preso: false });
  salvaVoci(voci);
  input.value = '';
  carica();
});

carica();