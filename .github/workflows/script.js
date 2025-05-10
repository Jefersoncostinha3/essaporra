const socket = io();
let username;
let mediaRecorder;
let audioChunks = [];
let currentRoom = 'public'; // Variável para rastrear a sala atual

// Elementos do DOM
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const chatContainer = document.getElementById('chat-container');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerError = document.getElementById('register-error');
const startRecordBtn = document.getElementById('start-record-btn');
const stopRecordBtn = document.getElementById('stop-record-btn');
const audioPreview = document.getElementById('audio-preview');
const createRoomInput = document.getElementById('create-room-name');
const joinRoomInput = document.getElementById('join-room-name');
const currentRoomDisplay = document.getElementById('current-room');

// Inicialmente, exibe apenas o container de login
if (chatContainer) {
    chatContainer.style.display = 'none';
}

function showRegister() {
    if (loginContainer && registerContainer) {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
        registerError.innerText = '';
    }
}

function showLogin() {
    if (registerContainer && loginContainer) {
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        loginError.innerText = '';
    }
}

async function register() {
    if (registerUsernameInput && registerPasswordInput && registerError) {
        const username = registerUsernameInput.value;
        const password = registerPasswordInput.value;

        if (!username || !password) {
            registerError.innerText = 'Por favor, preencha todos os campos.';
            return;
        }

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.text();
            if (response.ok) {
                alert(data);
                showLogin();
            } else {
                registerError.innerText = data;
            }
        } catch (error) {
            console.error("Erro ao registrar:", error);
            registerError.innerText = "Erro ao conectar com o servidor.";
        }
    }
}

async function login() {
    if (loginUsernameInput && loginPasswordInput && loginError && loginContainer && registerContainer && chatContainer) {
        username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        if (!username || !password) {
            loginError.innerText = 'Por favor, preencha todos os campos.';
            return;
        }

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok) {
                loginContainer.style.display = 'none';
                registerContainer.style.display = 'none';
                chatContainer.style.display = 'flex';
                socket.emit('set-username', username);
            } else {
                const errorMessage = await response.text();
                loginError.innerText = errorMessage;
            }
        } catch (error) {
            console.error("Erro ao logar:", error);
            loginError.innerText = "Erro ao conectar com o servidor.";
        }
    }
}

if (socket && loginError && chatContainer && registerContainer && loginContainer) {
    socket.on('login-error', (error) => {
        loginError.innerText = error;
        chatContainer.style.display = 'none';
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });
}

if (socket && messagesDiv) {
    socket.on('previous-messages', (messages) => {
        messages.forEach(addMessage);
    });
}

if (socket) {
    socket.on('new-message', (message) => {
        console.log('Frontend recebeu new-message:', message);
        addMessage(message);
    });
}

if (socket) {
    socket.on('new-audio', (audioData) => {
        addMessage(audioData);
    });
}

if (socket && messagesDiv) {
    socket.on('user-connected', (user) => {
        const messageElement = document.createElement('div');
        messageElement.innerText = `${user} entrou no chat.`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('user-disconnected', (user) => {
        const messageElement = document.createElement('div');
        messageElement.innerText = `${user} saiu do chat.`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

function addMessage(data) {
    if (messagesDiv && currentRoomDisplay) {
        console.log('Dados recebidos por addMessage:', data);
        if (currentRoom === 'public' || (data.room && data.room === currentRoom)) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            if (data.type === 'audio') {
                messageElement.classList.add('audio-message');
                messageElement.innerHTML = `<span class="user">${data.user}:</span> <audio controls src="data:audio/webm;codecs=opus;base64,${data.audio}"></audio>`;
                console.log('Mensagem de áudio adicionada:', messageElement.innerHTML);
            } else if (data.type === 'text') {
                messageElement.innerHTML = `<span class="user">${data.user}:</span> ${data.text}`;
                console.log('Mensagem de texto adicionada:', messageElement.innerHTML);
            }
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            console.log('Scroll do chat atualizado.');
        } else {
            console.log(`Mensagem para a sala "${data.room}" ignorada na sala "${currentRoom}".`);
        }
    }
}

function sendMessage() {
    if (messageInput && username && socket) {
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('send-message', { text: message, room: currentRoom });
            messageInput.value = '';
        } else if (!username) {
            alert('Você precisa estar logado para enviar mensagens.');
        }
    }
}

function createPrivateRoom() {
    if (createRoomInput && socket) {
        const roomName = createRoomInput.value.trim();
        if (roomName) {
            socket.emit('create-room', roomName);
            createRoomInput.value = '';
        } else {
            alert('Por favor, digite um nome para a sala.');
        }
    }
}

function joinPrivateRoom() {
    if (joinRoomInput && socket) {
        const roomName = joinRoomInput.value.trim();
        if (roomName) {
            socket.emit('join-room', roomName);
            joinRoomInput.value = '';
        } else {
            alert('Por favor, digite o nome da sala para entrar.');
        }
    }
}

function joinRoom(roomName) {
    if (socket) {
        socket.emit('join-room', roomName);
    }
}

if (socket && currentRoomDisplay && messagesDiv) {
    socket.on('room-created', (roomName) => {
        alert(`Sala "${roomName}" criada com sucesso!`);
        joinRoom(roomName); // Entra automaticamente na sala criada
    });

    socket.on('room-joined', (roomName) => {
        currentRoom = roomName;
        currentRoomDisplay.innerText = `Sala atual: ${roomName}`;
        messagesDiv.innerHTML = ''; // Limpa as mensagens ao mudar de sala
    });

    socket.on('room-not-found', (roomName) => {
        alert(`A sala "${roomName}" não foi encontrada.`);
    });

    socket.on('new-room-message', (data) => {
        console.log('Frontend recebeu new-room-message:', data);
        addMessage(data);
    });
}

async function startRecording() {
    if (navigator.mediaDevices && startRecordBtn && stopRecordBtn && audioPreview && socket) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const base64Audio = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                socket.emit('send-audio', { audio: base64Audio, room: currentRoom });
                audioPreview.src = URL.createObjectURL(audioBlob);
                audioPreview.style.display = 'block';
                startRecordBtn.disabled = false;
                stopRecordBtn.disabled = true;
            };

            mediaRecorder.start();
            startRecordBtn.disabled = true;
            stopRecordBtn.disabled = false;
            audioPreview.style.display = 'none';
        } catch (err) {
            console.error("Erro ao acessar o microfone:", err);
            alert("Erro ao acessar o microfone. Verifique as permissões do seu navegador.");
        }
    }
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
}