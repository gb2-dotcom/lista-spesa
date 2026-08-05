const form = document.getElementById('form-aggiungi');
const input = document.getElementById('input-voce');
const lista = document.getElementById('lista');

function leggiVoci() {
  return JSON.parse(localStorage.getItem('voci') || '[]');
}

function salvaVoci(voci) {
  localStorage.setItem('voci', JSON.stringify(voci));
}

function carica() {
  const voci = leggiVoci();
  lista.innerHTML = '';
  voci.forEach((voce, i) => {
    const li = document.createElement('li');
    li.textContent = voce;

    const bottoneRimuovi = document.createElement('button');
    bottoneRimuovi.textContent = '✕';
    bottoneRimuovi.addEventListener('click', () => rimuovi(i));

    li.appendChild(bottoneRimuovi);
    lista.appendChild(li);
  });
}

function rimuovi(indice) {
  const voci = leggiVoci();
  voci.splice(indice, 1);
  salvaVoci(voci);
  carica();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const voci = leggiVoci();
  voci.push(input.value.trim());
  salvaVoci(voci);
  input.value = '';
  carica();
});

carica();