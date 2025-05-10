const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Certifique-se de que esta é a origem correta do seu frontend
        methods: ["GET", "POST"]
    }
});

// Objeto para armazenar usuários (APENAS PARA DEMONSTRAÇÃO - NÃO USE EM PRODUÇÃO)
const users = {};
const rooms = {};

// Middleware para analisar o corpo das requisições como JSON
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Rota para REGISTRAR um novo usuário
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    console.log('Recebida requisição de registro:', { username, password });

    if (!username || !password) {
        console.log('Erro de registro: Nome de usuário ou senha faltando.');
        return res.status(400).send('Por favor, forneça nome de usuário e senha.');
    }

    if (users[username]) {
        console.log('Erro de registro: Nome de usuário já existe:', username);
        return res.status(409).send('Nome de usuário já existe.');
    }

    // Em uma aplicação real, você HASHING a senha aqui antes de salvar!
    users[username] = { password };
    console.log('Usuário registrado com sucesso:', username);
    res.status(200).send('Usuário registrado com sucesso!');
});

// Rota para LOGAR um usuário existente
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    console.log('Recebida requisição de login:', { username, password });

    if (!username || !password) {
        console.log('Erro de login: Nome de usuário ou senha faltando.');
        return res.status(400).json({ error: 'Por favor, forneça nome de usuário e senha.' });
    }

    if (users[username] && users[username].password === password) {
        console.log('Login bem-sucedido para o usuário:', username);
        res.status(200).json({ message: 'Login bem-sucedido!' });
    } else {
        console.log('Erro de login: Credenciais inválidas para o usuário:', username);
        res.status(401).send('Credenciais inválidas.');
    }
});

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);
    socket.username = null;
    socket.currentRoom = 'public';
    socket.join('public');

    socket.on('set-username', (username) => {
        socket.username = username;
        console.log('Nome de usuário definido:', socket.username, 'para socket:', socket.id);
        socket.to('public').emit('user-connected', username);
    });

    socket.on('create-room', (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = { creator: socket.id, members: [socket.id] };
            socket.join(roomName);
            socket.currentRoom = roomName;
            socket.emit('room-created', roomName);
            console.log(`Sala "${roomName}" criada por ${socket.username} (${socket.id})`);
        } else {
            socket.emit('room-not-found', roomName);
        }
    });

    socket.on('join-room', (roomName) => {
        if (rooms[roomName]) {
            rooms[roomName].members.push(socket.id);
            socket.join(roomName);
            socket.currentRoom = roomName;
            socket.emit('room-joined', roomName);
            console.log(`${socket.username} (${socket.id}) entrou na sala "${roomName}"`);
            socket.to(roomName).emit('user-connected', socket.username);
        } else {
            socket.emit('room-not-found', roomName);
        }
    });

    socket.on('send-message', (data) => {
        const { text, room } = data;
        const messageData = { user: socket.username, text, room, type: 'text' };
        io.to(room).emit('new-message', messageData);
        console.log(`Mensagem de ${socket.username} (${socket.id}) para "${room}": ${text}`);
    });

    socket.on('send-audio', (data) => {
        const { audio, room } = data;
        const audioData = { user: socket.username, audio, room, type: 'audio' };
        io.to(room).emit('new-audio', audioData);
        console.log(`Áudio de ${socket.username} (${socket.id}) para "${room}" enviado`);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id, socket.username);
        if (socket.username) {
            io.to(socket.currentRoom).emit('user-disconnected', socket.username);
        }
        for (const roomName in rooms) {
            if (rooms[roomName].members) {
                rooms[roomName].members = rooms[roomName].members.filter(id => id !== socket.id);
                if (rooms[roomName].members.length === 0 && rooms[roomName].creator === socket.id) {
                    delete rooms[roomName];
                    console.log(`Sala "${roomName}" removida.`);
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});