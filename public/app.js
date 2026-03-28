document.addEventListener('DOMContentLoaded', () => {
  // Modal toggling
  const openModal = (id) => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  };

  const closeModal = (id) => {
    document.getElementById(id).classList.remove('active');
  };

  document.getElementById('btn-open-create').addEventListener('click', () => openModal('modal-create'));
  document.getElementById('btn-open-join').addEventListener('click', () => openModal('modal-join'));
  
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModal(e.target.dataset.close);
    });
  });

  // Name Generator
  const generateAnonName = () => {
    const adjectives = ["Silent", "Ghost", "Phantom", "Shadow", "Hollow", "Faded", "Drifting", "Nameless", "Veiled", "Obscure"];
    const nouns = ["Fox", "Raven", "Wolf", "Moth", "Ember", "Creek", "Tide", "Wisp", "Vault", "Echo"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj} ${noun} ${num}`;
  };

  // Generate Room Code
  document.getElementById('btn-generate-code').addEventListener('click', () => {
    const adjectives = ["silent", "fast", "hidden", "dark", "neon", "cyan", "deep", "cold", "lost", "wild"];
    const nouns = ["fox", "wolf", "star", "moon", "wave", "wind", "fire", "code", "bird", "tree"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    document.getElementById('create-room-code').value = `${adj}-${noun}-${num}`;
    clearError('create-code-error');
  });

  // Password Strength
  const pwdInput = document.getElementById('create-password');
  const pwdStrengthBar = document.getElementById('pwd-strength');
  pwdInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length === 0) {
      pwdStrengthBar.style.width = '0%';
    } else if (val.length < 4) {
      pwdStrengthBar.style.width = '33%';
      pwdStrengthBar.style.backgroundColor = 'var(--error)';
    } else if (val.length < 8) {
      pwdStrengthBar.style.width = '66%';
      pwdStrengthBar.style.backgroundColor = 'var(--secondary)';
    } else {
      pwdStrengthBar.style.width = '100%';
      pwdStrengthBar.style.backgroundColor = 'var(--success)';
    }
  });

  // Password Type Toggle
  let passwordType = 'reusable';
  const toggleBtnGroup = document.getElementById('pwd-type-toggle');
  const toggleBtns = toggleBtnGroup.querySelectorAll('button');
  const toggleBg = toggleBtnGroup.querySelector('.toggle-bg');
  
  toggleBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      passwordType = btn.dataset.value;
      toggleBg.style.transform = `translateX(${index * 100}%)`;
    });
  });

  // Tooltip Logic
  const tooltipBtn = document.getElementById('info-tooltip-btn');
  if (tooltipBtn) {
    tooltipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltipBtn.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
      if (!tooltipBtn.contains(e.target)) {
        tooltipBtn.classList.remove('active');
      }
    });
  }

  // Validation Helpers
  const showError = (elId, msg) => {
    const el = document.getElementById(elId);
    el.classList.remove('visible');
    void el.offsetWidth; // trigger reflow for animation restart
    el.textContent = msg;
    el.classList.add('visible');
  };

  const clearError = (elId) => {
    document.getElementById(elId).classList.remove('visible');
  };

  // Clear errors on typing
  document.getElementById('create-password').addEventListener('input', () => clearError('create-pwd-error'));
  document.getElementById('join-password').addEventListener('input', () => clearError('join-server-error'));
  document.getElementById('join-room-code').addEventListener('input', () => clearError('join-server-error'));

  // Room Code Validation (Alphanumeric and hyphens)
  const codeRegex = /^[a-zA-Z0-9-]+$/;
  document.getElementById('create-room-code').addEventListener('input', (e) => {
    if (e.target.value && !codeRegex.test(e.target.value)) {
      showError('create-code-error', 'Only letters, numbers, and hyphens allowed.');
    } else {
      clearError('create-code-error');
    }
  });

  // Create Room Form Submit
  const btnSubmitCreate = document.getElementById('btn-submit-create');
  btnSubmitCreate.addEventListener('click', async () => {
    const roomCode = document.getElementById('create-room-code').value.trim();
    const password = pwdInput.value;
    
    let hasError = false;

    if (!roomCode) {
      showError('create-code-error', 'Please enter or generate a room code.');
      hasError = true;
    } else if (document.getElementById('create-code-error').classList.contains('visible') && 
               document.getElementById('create-code-error').textContent === 'Only letters, numbers, and hyphens allowed.') {
      hasError = true;
    }

    if (!password) {
      showError('create-pwd-error', 'Please set a password.');
      hasError = true;
    } else if (password.length < 4) {
      showError('create-pwd-error', 'Password must be at least 4 characters.');
      hasError = true;
    }

    if (hasError) return;
    
    const originalText = btnSubmitCreate.textContent;
    btnSubmitCreate.textContent = 'Creating...';
    
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, password, passwordType })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          showError('create-code-error', 'This room code is already taken. Try a different one.');
        } else {
          showError('create-code-error', data.error || 'Failed to create room.');
        }
      } else {
        // Show Created Modal
        document.getElementById('display-room-code').textContent = data.roomCode;
        document.getElementById('display-password').textContent = password;
        
        sessionStorage.setItem('echox_room', JSON.stringify({
          roomCode: data.roomCode,
          anonName: generateAnonName(),
          authed: true
        }));

        openModal('modal-created');
      }
    } catch (e) {
      showError('create-code-error', 'Network error.');
    } finally {
      btnSubmitCreate.textContent = originalText;
    }
  });

  // Password visibility toggle
  document.getElementById('btn-toggle-pwd-visibility').addEventListener('click', (e) => {
    const pwdDisplay = document.getElementById('display-password');
    if (pwdDisplay.style.webkitTextSecurity === 'none' || !pwdDisplay.style.webkitTextSecurity) {
      pwdDisplay.style.webkitTextSecurity = 'disc';
      e.target.textContent = 'Show';
    } else {
      pwdDisplay.style.webkitTextSecurity = 'none';
      e.target.textContent = 'Hide';
    }
  });
  document.getElementById('display-password').style.webkitTextSecurity = 'disc';

  // Copy Invite
  document.getElementById('btn-copy-invite').addEventListener('click', (e) => {
    const roomCode = document.getElementById('display-room-code').textContent;
    const password = document.getElementById('display-password').textContent;
    const url = window.location.origin;
    
    const inviteText = `EchoX Room\nCode: ${roomCode}\nPassword: ${password}\nJoin at: ${url}`;
    
    navigator.clipboard.writeText(inviteText).then(() => {
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy Invite'; }, 2000);
    });
  });

  // Enter Room (From created modal)
  document.getElementById('btn-enter-room').addEventListener('click', () => {
    const roomCode = document.getElementById('display-room-code').textContent;
    window.location.href = `/room/${roomCode}`;
  });

  // Join Room Form Submit
  const btnSubmitJoin = document.getElementById('btn-submit-join');
  btnSubmitJoin.addEventListener('click', async () => {
    const roomCode = document.getElementById('join-room-code').value.trim();
    const password = document.getElementById('join-password').value;

    if (!roomCode || !password) {
      showError('join-server-error', 'Invalid room code or password.');
      return;
    }
    
    const originalText = btnSubmitJoin.textContent;
    btnSubmitJoin.textContent = 'Joining...';
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        showError('join-server-error', data.error || 'Invalid room code or password.');
      } else {
        sessionStorage.setItem('echox_room', JSON.stringify({
          roomCode: data.roomCode,
          anonName: generateAnonName(),
          authed: true
        }));

        window.location.href = `/room/${data.roomCode}`;
      }
    } catch (e) {
      showError('join-server-error', 'Network error.');
    } finally {
      btnSubmitJoin.textContent = originalText;
    }
  });
});
