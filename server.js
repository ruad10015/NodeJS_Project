require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {mongoose} = require('mongoose');
const {RoomMessage} = require('./model/roomMessage.model');
const {PrivateMessage} = require('./model/privateMessage.model');
const {User} = require('./model/user.model');
const { encrypt, decrypt } = require("./encryption");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const users = {};
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('register', (username) => {
        users[socket.id] = username;
        console.log(`Registered ${username}`);
    });

    socket.on('login', (username) => {
        users[socket.id] = username;
        console.log(`Logined ${username}`);
    });

    socket.on('send_private_message', ({ to, message }) => {
        const targetSocketId = Object.keys(users).find(
            (key) => users[key] === to
        );
        // console.log(targetSocketId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('receive_private_message', {
                from: users[socket.id],
                message,
            });
            const savedMessage = new PrivateMessage({
                from:users[socket.id],
                to:to,
                message:decrypt(message),
            })

            savedMessage.save();
        }
    });

    socket.on('join_room', (room) => {
        socket.join(room);
        rooms[room] = rooms[room] || [];
        rooms[room].push(socket.id);
        console.log(`${users[socket.id]} joined room ${room}`);
    });

    socket.on('send_room_message', ({ room, message }) => {
        io.to(room).emit('receive_room_message', {
            from: users[socket.id],
            message,
        });

        const savedMessage = new RoomMessage({
            room:room,
            from:users[socket.id],
            message:decrypt(message),
        })

        savedMessage.save();
    });

    socket.on('disconnect', () => {
        console.log(`${users[socket.id]} disconnected`);
        delete users[socket.id];
    });
});

app.get('/users', (req, res) => {
    res.json(Object.values(users));
});

app.get('/rooms', (req, res) => {
    res.json(Object.keys(rooms));
});

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected: " + conn.connection.host);
    } catch (error) {
        console.error("Error connecting to MONGODB: " + error.message);
        process.exit(1);
    }
};

server.listen(3000, () => {
    connectDB();
    console.log('Server listening on port 3000');
});