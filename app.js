const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const users = new Map(); // Map to store username and socket ID
const mongoDBURL = 'mongodb://127.0.0.1/mydatabase';

(async () => {
  try {
    await mongoose.connect(mongoDBURL, { useNewUrlParser: true, useUnifiedTopology: true, bufferCommands: false });
    console.log('Connected to MongoDB');

    const chatSchema = new mongoose.Schema({
      username: String,
      message: String
    });

    const Chat = mongoose.model('Chat', chatSchema);

    app.get('/', (req, res) => {
      res.sendFile(__dirname + '/index.html')
    });

    io.on('connection', (socket) => {
      console.log('A user connected');
      // Set a user name
      socket.on('setUsername', (username) => {
        users.set(socket.id, username);
        // Join User
        io.emit('userJoined', username);
      });

      socket.on('chatMessage', async (message) => {
        const username = users.get(socket.id);
        io.emit('chatMessage', { username, message });

        // Save chat message to MongoDB
        try {
          const newChat = new Chat({
            username,
            message
          });

          await newChat.save();
          console.log('Chat message saved:', newChat);
        } catch (error) {
          console.error('Error saving chat message:', error);
        }
      });
      // Delete the user's name when they disconnect
      socket.on('disconnect', () => {
        const username = users.get(socket.id);
        users.delete(socket.id);
        io.emit('userLeft', username);
        console.log('A user disconnected');
      });
    });

    server.listen(3000, () => {
      console.log('Server is running on port 3000');
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();
