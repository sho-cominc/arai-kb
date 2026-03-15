function el(id) { return document.getElementById(id); }
function showModal(id) { el(id).classList.add('show'); }
function hideModal(id) { el(id).classList.remove('show'); }
function setDisplay(id, val) { el(id).style.display = val; }
