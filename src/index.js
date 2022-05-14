const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users.js')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => {
    console.log('New websocket connection')

    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})

        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('ADMIN' ,'Welcome to the chat.'))
        socket.broadcast.to(user.room).emit('message', generateMessage('ADMIN', `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room.charAt(0).toUpperCase() + user.room.slice(1),
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('location', (position, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?=${position.latitude},${position.longitude}`))
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        console.log('Message sent to server: ' + message)

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('ADMIN', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room.charAt(0).toUpperCase() + user.room.slice(1),
                users: getUsersInRoom(user.room)
            })
        }
    })


})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})