/* === Hawaii Football Recruits — Admin Panel === */

(function () {
  'use strict';

  // Default password — change this or replace with a proper auth mechanism
  const ADMIN_PASS = 'aloha2026';

  const STORAGE_KEY = 'hfr_players';

  // DOM refs
  const loginGate = document.getElementById('loginGate');
  const adminContent = document.getElementById('adminContent');
  const passwordInput = document.getElementById('adminPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const playerList = document.getElementById('playerList');
  const addPlayerBtn = document.getElementById('addPlayerBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const formOverlay = document.getElementById('formOverlay');
  const formClose = document.getElementById('formClose');
  const formCancel = document.getElementById('formCancel');
  const formTitle = document.getElementById('formTitle');
  const playerForm = document.getElementById('playerForm');
  const editIdField = document.getElementById('editId');

  let players = [];

  // --- Auth ---
  function checkAuth() {
    if (sessionStorage.getItem('hfr_admin') === 'true') {
      showAdmin();
    }
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  function doLogin() {
    if (passwordInput.value === ADMIN_PASS) {
      sessionStorage.setItem('hfr_admin', 'true');
      showAdmin();
    } else {
      loginError.textContent = 'Incorrect password.';
    }
  }

  function showAdmin() {
    loginGate.style.display = 'none';
    adminContent.style.display = 'block';
    loadPlayers();
  }

  // --- Data ---
  function loadPlayers() {
    // Try localStorage first, fall back to fetching the JSON file
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      players = JSON.parse(stored);
      renderList();
    } else {
      fetch('data/players.json')
        .then(r => r.json())
        .then(data => {
          players = data;
          savePlayers();
          renderList();
        })
        .catch(() => {
          players = [];
          renderList();
        });
    }
  }

  function savePlayers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  }

  // --- List ---
  function renderList() {
    if (players.length === 0) {
      playerList.innerHTML = '<div class="admin-empty">No players yet. Click "+ Add Player" to get started.</div>';
      return;
    }

    // Sort by class year then name
    const sorted = [...players].sort((a, b) => a.classYear - b.classYear || a.name.localeCompare(b.name));

    playerList.innerHTML = sorted.map(p => `
      <div class="admin-player-row" data-id="${p.id}">
        <img class="admin-player-photo" src="${p.photo}" alt=""
             onerror="this.src='photos/default.svg'">
        <div class="admin-player-info">
          <div class="admin-player-name">${esc(p.name)}</div>
          <div class="admin-player-meta">${esc(Array.isArray(p.position) ? p.position.join(' / ') : p.position)} &bull; ${p.classYear} &bull; ${esc(p.school)}</div>
        </div>
        <div class="admin-player-actions">
          <button class="btn btn-outline btn-sm edit-btn" data-id="${p.id}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');

    playerList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openForm(btn.dataset.id));
    });

    playerList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePlayer(btn.dataset.id));
    });
  }

  // --- Delete ---
  function deletePlayer(id) {
    const p = players.find(x => x.id === id);
    if (!p) return;
    if (!confirm('Delete ' + p.name + '? This cannot be undone.')) return;
    players = players.filter(x => x.id !== id);
    savePlayers();
    renderList();
  }

  // --- Form ---
  addPlayerBtn.addEventListener('click', () => openForm(null));

  function openForm(id) {
    playerForm.reset();
    editIdField.value = '';

    if (id) {
      const p = players.find(x => x.id === id);
      if (!p) return;
      formTitle.textContent = 'Edit Player';
      editIdField.value = p.id;
      document.getElementById('fName').value = p.name;
      // Set position checkboxes
      const positions = Array.isArray(p.position) ? p.position : [p.position];
      document.querySelectorAll('#fPosition input[type="checkbox"]').forEach(cb => {
        cb.checked = positions.includes(cb.value);
      });
      document.getElementById('fSchool').value = p.school;
      document.getElementById('fClassYear').value = p.classYear;
      document.getElementById('fHeight').value = p.height || '';
      document.getElementById('fWeight').value = p.weight || '';
      document.getElementById('fGpa').value = p.gpa || '';
      document.getElementById('fPhoto').value = (p.photo && p.photo !== 'photos/default.svg') ? p.photo.replace('photos/', '') : '';
      if (p.measurables) {
        document.getElementById('fForty').value = p.measurables.fortyYard || '';
        document.getElementById('fShuttle').value = p.measurables.shuttle || '';
        document.getElementById('fVertical').value = p.measurables.vertical || '';
        document.getElementById('fBroadJump').value = p.measurables.broadJump || '';
        document.getElementById('fBench').value = p.measurables.bench || '';
      }
      document.getElementById('fAwards').value = (p.awards || []).join('\n');
      if (p.links) {
        document.getElementById('fHudl').value = p.links.hudl || '';
        document.getElementById('fTwitter').value = p.links.twitter || '';
        document.getElementById('fRivals').value = p.links.rivals || '';
        document.getElementById('f247').value = p.links.twoFourSeven || '';
        document.getElementById('fYoutube').value = p.links.youtube || '';
      }
      if (p.contact) {
        document.getElementById('fCoachName').value = p.contact.coachName || '';
        document.getElementById('fEmail').value = p.contact.email || '';
        document.getElementById('fPhone').value = p.contact.phone || '';
      }
    } else {
      formTitle.textContent = 'Add Player';
    }

    formOverlay.classList.add('active');
  }

  function closeForm() {
    formOverlay.classList.remove('active');
  }

  formClose.addEventListener('click', closeForm);
  formCancel.addEventListener('click', closeForm);
  formOverlay.addEventListener('click', e => {
    if (e.target === formOverlay) closeForm();
  });

  playerForm.addEventListener('submit', e => {
    e.preventDefault();

    const name = document.getElementById('fName').value.trim();
    const id = editIdField.value || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const photoFile = document.getElementById('fPhoto').value.trim();

    const player = {
      id: id,
      name: name,
      classYear: parseInt(document.getElementById('fClassYear').value, 10),
      position: Array.from(document.querySelectorAll('#fPosition input:checked')).map(cb => cb.value),
      school: document.getElementById('fSchool').value.trim(),
      height: document.getElementById('fHeight').value.trim(),
      weight: parseInt(document.getElementById('fWeight').value, 10) || 0,
      gpa: document.getElementById('fGpa').value.trim(),
      photo: photoFile ? 'photos/' + photoFile : 'photos/default.svg',
      measurables: {
        fortyYard: document.getElementById('fForty').value.trim(),
        shuttle: document.getElementById('fShuttle').value.trim(),
        vertical: document.getElementById('fVertical').value.trim(),
        broadJump: document.getElementById('fBroadJump').value.trim(),
        bench: document.getElementById('fBench').value.trim()
      },
      awards: document.getElementById('fAwards').value.split('\n').map(s => s.trim()).filter(Boolean),
      links: {
        hudl: document.getElementById('fHudl').value.trim(),
        twitter: document.getElementById('fTwitter').value.trim(),
        rivals: document.getElementById('fRivals').value.trim(),
        twoFourSeven: document.getElementById('f247').value.trim(),
        youtube: document.getElementById('fYoutube').value.trim()
      },
      contact: {
        coachName: document.getElementById('fCoachName').value.trim(),
        email: document.getElementById('fEmail').value.trim(),
        phone: document.getElementById('fPhone').value.trim()
      }
    };

    const existingIdx = players.findIndex(x => x.id === editIdField.value);
    if (existingIdx >= 0) {
      players[existingIdx] = player;
    } else {
      // Check for duplicate id
      if (players.some(x => x.id === player.id)) {
        player.id += '-' + Date.now();
      }
      players.push(player);
    }

    savePlayers();
    renderList();
    closeForm();
  });

  // --- Export ---
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(players, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Import ---
  importFile.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        if (!confirm('This will replace all current players with ' + data.length + ' imported players. Continue?')) return;
        players = data;
        savePlayers();
        renderList();
      } catch (err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  // --- Escape ---
  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  // Init
  checkAuth();

})();
