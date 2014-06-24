/**
 * Created by giemza on 11.03.14.
 */

var io;
var Session = require('../model/model.js').Session;
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

exports.removeMember=function(members,session,usermail){

    //io.sockets.in(session).emit('member leaved',{session:session,usermail:usermail});

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i] && clients[j].user!=usermail){

                io.sockets.socket(clients[j].socketId).emit('member leaved',{session:session,usermail:usermail});
            }
        }

    }


}

exports.tellMember=function(user,session){

    for(var i=0;i<clients.length;i++){
        if(clients[i].user==user){
            io.sockets.socket(clients[i].socketId).emit('No more Access');
        }
    }

}

exports.addMember = function(members,user,username,session,permission) {
    //io.sockets.in(session).emit('member accepted', {user:user,username:username,permission:permission,session:session});

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i] && clients[j].user!=user){

                io.sockets.socket(clients[j].socketId).emit('member accepted', {user:user,username:username,permission:permission,session:session});
            }
        }

    }
}

exports.sessionOwner=function(members,session,user,username){

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i] && clients[j].user!=user){

                io.sockets.socket(clients[j].socketId).emit('session owner', {user:user,username:username,session:session});
            }
        }

    }

}

exports.MemberPermissionChanged=function(session,user,permission){

    var message={user:user,permission:permission};
    io.sockets.in(session).emit('Permission Changed', message);


}

exports.setSessionPass=function(members,owner,session){

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i] ){

                io.sockets.socket(clients[j].socketId).emit('password set',{session:session});
            }
        }

    }

};

exports.sessionPassRemoved=function(members,owner,session){

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i] ){

                io.sockets.socket(clients[j].socketId).emit('password removed',{session:session});
            }
        }

    }

};

exports.sessionVisibilityChanged=function(members,session,visibility){

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i]){

                io.sockets.socket(clients[j].socketId).emit('visibility changed',{session:session,visibility:visibility});
            }
        }

    }

};

exports.sessionTitleChanged=function(members,session,title){

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i]){

                io.sockets.socket(clients[j].socketId).emit('title changed',{session:session,title:title});
            }
        }

    }



};

exports.NoteCounter = function(note,members) {

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i]){


                io.sockets.socket(clients[j].socketId).emit('Note increment', note);
            }
        }

    }
}

exports.NoteDecrement = function(note,members) {

    for(var i=0;i<members.length;i++){

        for(var j=0;j<clients.length;j++){
            if(clients[j].user==members[i]){


                io.sockets.socket(clients[j].socketId).emit('Note decrement', note);
            }
        }

    }
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

exports.lockNote=function(session,note){
    io.sockets.in(session).emit('note lock',note);
}