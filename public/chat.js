document.addEventListener('DOMContentLoaded', () => {
  // 1. Session check
  const sessionStr = sessionStorage.getItem('echox_room');
  if (!sessionStr) {
    window.location.href = '/';
    return;
  }

  const session = JSON.parse(sessionStr);
  const pathParts = window.location.pathname.split('/');
  const currentRoomCode = pathParts[pathParts.length - 1];

  if (session.roomCode !== currentRoomCode || !session.authed) {
    window.location.href = '/';
    return;
  }

  // Set top bar code layout
  document.getElementById('top-room-code').textContent = session.roomCode;

  // 2. Formatting UI
  const formatTime = (isoString) => {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const createMessageElem = ({ text, anonName, timestamp, type, isMine }) => {
    const msgDiv = document.createElement('div');
    if (type === 'system') {
      msgDiv.className = 'message system';
      msgDiv.innerHTML = `<div class="message-text">${text}</div>`;
    } else {
      msgDiv.className = `message ${isMine ? 'mine' : 'others'}`;
      msgDiv.innerHTML = `
        ${!isMine ? `<div class="message-name">${anonName}</div>` : ''}
        <div class="message-bubble">
          <div class="message-text">${text}</div>
          <div class="message-time">${formatTime(timestamp)}</div>
        </div>
      `;
    }
    return msgDiv;
  };

  const messagesContainer = document.getElementById('messages-container');
  const appendMessage = (data) => {
    const elem = createMessageElem(data);
    messagesContainer.appendChild(elem);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // 3. Socket Connection
  const socket = io();

  socket.emit('join-room', {
    roomCode: session.roomCode,
    anonName: session.anonName
  });

  socket.on('user-count', (data) => {
    document.querySelectorAll('.user-count-display').forEach(el => {
      el.textContent = `${data.count} online`;
    });
  });

  socket.on('message', (data) => {
    // Other users' messages or system messages
    appendMessage({
      ...data,
      isMine: false
    });
  });

  socket.on('room-deleted', () => {
    // Show overlay
    document.getElementById('modal-deleted').classList.add('active');
    socket.disconnect();
    sessionStorage.removeItem('echox_room');
  });

  // 4. Send Messaging
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');

  const sendMessage = () => {
    let text = chatInput.value;
    text = text.trim();
    
    if (!text) {
      chatInput.classList.remove('shake');
      void chatInput.offsetWidth; // trigger reflow to reset CSS animation
      chatInput.classList.add('shake');
      return;
    }

    const timestamp = new Date().toISOString();
    
    // Optimistic UI append
    appendMessage({
      text,
      anonName: session.anonName,
      timestamp,
      type: 'user',
      isMine: true
    });

    // Emit to server
    socket.emit('send-message', {
      roomCode: session.roomCode,
      text,
      anonName: session.anonName,
      timestamp
    });

    chatInput.value = '';
    chatInput.focus();
  };

  btnSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // 5. Leave Room Logic
  const leaveRoom = () => {
    sessionStorage.removeItem('echox_room');
    socket.disconnect();
    window.location.href = '/';
  };

  document.getElementById('btn-leave').addEventListener('click', leaveRoom);
  document.getElementById('btn-home').addEventListener('click', leaveRoom); // on deleted modal

  window.addEventListener('beforeunload', () => {
    // Attempt cleanup on tab close
    sessionStorage.removeItem('echox_room');
  });

  // 6. Mobile Keyboard Viewport Fix
  if (window.visualViewport) {
    const roomLayout = document.getElementById('room-layout');
    window.visualViewport.addEventListener('resize', () => {
      // Adjust the internal layout height to avoid fixed bottom bar covering input
      roomLayout.style.height = `${window.visualViewport.height}px`;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    // Set initial
    roomLayout.style.height = `${window.visualViewport.height}px`;
  }
});
