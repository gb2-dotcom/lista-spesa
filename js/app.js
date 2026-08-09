const form = document.getElementById('form-aggiungi');
const input = document.getElementById('input-voce');
const lista = document.getElementById('lista');

function leggiVoci() {
  try {
    const dati = JSON.parse(localStorage.getItem('voci') || '[]');
    if (!Array.isArray(dati)) {
      return [];
    }
    return dati;
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

    // La voce è un bottone, non testo inerte: così è raggiungibile da
    // tastiera e lo screen reader la annuncia come attivabile.
    const bottoneModifica = document.createElement('button');
    bottoneModifica.type = 'button';
    bottoneModifica.className = 'voce';
    bottoneModifica.textContent = voce;
    bottoneModifica.setAttribute('aria-label', `Modifica ${voce}`);
    bottoneModifica.addEventListener('click', () => apriModifica(i));

    const bottoneRimuovi = document.createElement('button');
    bottoneRimuovi.type = 'button';
    bottoneRimuovi.textContent = '✕';
    bottoneRimuovi.setAttribute('aria-label', `Rimuovi ${voce}`);
    bottoneRimuovi.addEventListener('click', () => rimuovi(i));

    li.append(bottoneModifica, bottoneRimuovi);
    lista.appendChild(li);
  });
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
  campo.value = voce;
  campo.setAttribute('aria-label', `Nuovo nome per ${voce}`);

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
    voci[indice] = nuovaVoce;
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
  voci.push(voce);
  salvaVoci(voci);
  input.value = '';
  carica();
});

carica();