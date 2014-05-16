/**
 * Created by giemza on 11.03.14.
 */

var io;
    
var logger;

exports.setLogger = function(_logger) {
    logger = _logger;
}

var clients=[];
exports.listen = function listen(server) {
    // setting up socket.io
    io = require('socket.io').listen(server);
    io.set('log level', 1);



    io.sockets.on('connection', function (socket) {

        var client={};

        logger.debug(socket.id + ' connected to the server.');

        var session;

        socket.on('join session', function (data) {

            client={user:data.user,socketId:socket.id};
            clients.push(client);
            console.log(clients);
            session = data.session;
            socket.join(session);
            console.debug('client ' + socket.id + ' joined session ' + session);
        });

        socket.on('update note', function (note) {
            socket.broadcast.to(session).emit('note updated', note);
        });

        socket.on('disconnect' ,function(){

            for(var i=0;i<clients.length;i++){
                if(clients[i].user==client.user){
                    clients.splice(clients.indexOf(client),1);
                }
            }
        });
    });
}

exports.sendInvitation=function(invitation){

    console.log(invitation);
    for(var i=0;i<clients.length;i++){
        if(clients[i].user==invitation.user){
            io.sockets.socket(clients[i].socketId).emit('invitation incoming',invitation);
        }
    }

}

exports.deleteSession = function(sessionID){

    io.sockets.emit('session deleted',sessionID);
}

exports.removeMember=function(session,user){


}

exports.addMember = function(user,username,session,permission) {
    io.sockets.in(session).emit('member accepted', {user:user,username:username,permission:permission});
}

exports.addNoteToSession = function(note) {
    io.sockets.in(note.sessionId).emit('note added', note);
}

exports.updateNoteInSession = function(note) {
    io.sockets.in(note.sessionId).emit('note updated', note);
}

exports.deleteNoteFromSession = function(note) {
    io.sockets.in(note.sessionId).emit('note removed', note);
}