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

    // Il browser cerca un service worker nuovo solo quando c'è una
    // navigazione. Una PWA aperta dalla schermata home spesso non ne fa
    // nessuna: resta in secondo piano e torna in primo piano senza
    // ricaricare, quindi può restare per settimane su una versione
    // vecchia senza accorgersene. Qui il controllo parte ogni volta che
    // l'app torna in vista.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Senza rete fallisce, ed è la normalità in un'app fatta per
        // funzionare offline: non c'è niente da segnalare.
        registration.update().catch(() => {});
      }
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
