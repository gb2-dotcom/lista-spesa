// Safari su iOS ignora user-scalable=no nella meta viewport: questi
// ascoltatori bloccano il pinch dove la direttiva non basta.

['gesturestart', 'gesturechange', 'gestureend'].forEach((evento) => {
  document.addEventListener(evento, (e) => e.preventDefault(), { passive: false });
});

document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });
