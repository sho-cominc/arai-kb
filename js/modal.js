function buildModal(title, sub, content) {
  el('modalTitle').textContent = title;
  el('modalSub').textContent = sub || '';
  el('modalTabs').innerHTML = '';
  el('modalBody').innerHTML = content;
  el('modalOverlay').classList.add('active');
}

function closeModal() { el('modalOverlay').classList.remove('active'); }
