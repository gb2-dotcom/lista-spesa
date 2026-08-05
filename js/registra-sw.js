if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then((registration) => {

    const bottone = document.getElementById('bottone-ricarica');
    let workerInAttesa = null;
    let ricaricamentoAvviato = false;

    function mostraBanner(worker) {
      workerInAttesa = worker;
      document.getElementById('banner-aggiornamento').hidden = false;
    }

    bottone.addEventListener('click', () => {
      if (workerInAttesa) {
        workerInAttesa.postMessage('SALTA_ATTESA');
      }
    });

    if (registration.waiting) {
      mostraBanner(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const nuovoWorker = registration.installing;

      nuovoWorker.addEventListener('statechange', () => {
        if (nuovoWorker.state === 'installed' && navigator.serviceWorker.controller) {
          mostraBanner(registration.waiting);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (ricaricamentoAvviato) {
        return;
      }
      ricaricamentoAvviato = true;
      window.location.reload();
    });

  }).catch((errore) => {
    console.error('Registrazione del service worker fallita', errore);
  });
}
