const form = document.getElementById('form-aggiungi');
const input = document.getElementById('input-voce');
const lista = document.getElementById('lista');

function carica() {
  const voci = JSON.parse(localStorage.getItem('voci') || '[]');
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
  const voci = JSON.parse(localStorage.getItem('voci') || '[]');
  voci.splice(indice, 1);
  localStorage.setItem('voci', JSON.stringify(voci));
  carica();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const voci = JSON.parse(localStorage.getItem('voci') || '[]');
  voci.push(input.value.trim());
  localStorage.setItem('voci', JSON.stringify(voci));
  input.value = '';
  carica();
});

carica();