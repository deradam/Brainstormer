/**
 * Created by giemza on 11.03.14.
 */

var io;
    
var logger;

exports.setLogger = function(_logger) {
    logger = _logger;
}


exports.listen = function listen(server) {
    // setting up socket.io
    io = require('socket.io').listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        logger.debug(socket.id + ' connected to the server.');

        var session;

        socket.on('join session', function (_session) {
            session = _session;
            socket.join(session);
            console.debug('client ' + socket.id + ' joined session ' + session);
        });

        socket.on('update note', function (note) {
            socket.broadcast.to(session).emit('note updated', note);
        });
    });
}

exports.sendInvitation=function(useremail,sessionID){


}

exports.deleteSession = function(sessionID){
    console.log("deleting session");
    io.sockets.emit('session deleted',sessionID);
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