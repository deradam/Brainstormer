/**
 * RESTful Web services
 *
 */

var ws = require('../io/websocket');
var util = require('util');
var crypt = require('crypto');
var models = require('../model/model');
var Session = models.Session;
var Note = models.Note;

var User = require('../model/model.js').User;

exports.getNotes = function (req, res, next) {

    var sessionId = req.params.sessionId;

    var postsessid=req.body.sessionId;


    if (sessionId) {
        Session.findOne({uuid:sessionId}, function (error, session) {
            if (error) {
                next(new Error('Error during session query'));
            } else {
                if (session) {
                    Note.find({sessionId:session.uuid}, function (error, notes, next) {
                        if (error) {
                            next(new Error('Cannot query notes from database!'));
                        } else {
                            res.send(notes);
                        }
                    });
                } else {
                    next(new Error('No session found with id ' + sessionId));
                }
            }
        });
    } else {
        next(Error('Cannot query notes without an session id'));
    }
};

exports.postNewNote = function (req, res, next) {


    if (req.body) {
        var newNote = req.body;
        var note = new Note(newNote);
        note.post('save', function (next) {
            res.send(note._id);
            ws.addNoteToSession(note);
            Session.findOne({uuid:note.sessionId},function(err,session){
                if(session){
                    ws.NoteCounter(note,session.users);
                }
            });
        });
        note.save(function (error) {
            if (!error) {
                console.log('Successfully written ' + util.inspect(note));
            } else {
                next(new Error('Cannot save note ' + util.inspect(error)));
            }
        });
    }
};

exports.getNoteById = function (req, res, next) {
    var id = req.params.id;
    if (id) {
        var _id = new models.ObjectId(id);
        Note.findById(_id, function (error, note) {
            if (error) {
                next(new Error('Cannot retrieve note with id ' + id));
            } else {
                res.send(note);
            }
        });
    }
};

exports.updateNote = function (req, res, next) {
    if (req.body && req.params.id) {
        var updatedNote = req.body;
        var _id = models.ObjectId.fromString(req.params.id);
        Note.findById(_id, function (error, note) {
            if (error) {
                next(new Error('Cannot find note for update with id ' + id));
            } else {
                note.text = updatedNote.text || note.text;
                note.top = updatedNote.top || note.top;
                note.left = updatedNote.left || note.left;
                note.color = updatedNote.color || note.color;
                note.save(function (error) {
                    if (error) {
                        console.log(util.identify(error));
                        next(new Error('Cannot save updated note with id ' + note._id));
                    } else {
                        ws.updateNoteInSession(note);
                        console.log('Successfully updated note with id ' + note._id);
                        res.end();
                    }
                });
            }
        });
    }
};

exports.deleteNote = function (req, res, next) {
    if (req.params.id && req.params.id) {
        var _id = models.ObjectId.fromString(req.params.id);
        Note.findById(_id, function (error, note) {
            if (error) {
                next(new Error('Cannot find note to delete with id ' + id));
            } else {
                note.remove(function (error) {
                    if (error) {
                        next(new Error('Cannot delete note with id ' + note._id));
                    } else {
                        ws.deleteNoteFromSession(note);
                        Session.findOne({uuid:note.sessionId},function(err,session){
                            if(session){
                                ws.NoteDecrement(note,session.users);
                            }
                        });
                        console.log('Successfully deleted note with id: ' + note._id);
                        res.end();
                    }
                });
            }
        });
    }
};


exports.inviteUserToSession=function(req,res,next){
    var usermail=req.body.usermail;
    var sessionID=req.body.sessionID;
    var permission=req.body.permission;
    var invitation={};


    if(usermail && sessionID){

        User.findOne({email:usermail},function(err,user){

            if(!err){

                Session.findOne({uuid:sessionID},function(err,session){


                    if(user){

                        if(user.invitations.indexOf(session.uuid)==-1 && session.users.indexOf(user.email)==-1){

                            if(permission=='Read'&& session.read.indexOf(user.email)==-1){
                                session.read.push(user.email);
                            }

                            if(user.invitations.indexOf(user.email)==-1){
                                user.invitations.push(session.uuid);
                            }


                            user.unread=user.unread+1;

                            user.save(function(err){

                                session.save(function(err){
                                    if(!err){
                                        invitation={user:user.email,session:session.uuid,unread:user.unread};
                                        ws.sendInvitation(invitation);
                                        res.send('1');
                                    }else{
                                        next(new Error('Cant save invitation to Session' + sessionID+' for '+usermail ));
                                    }

                                });

                            });


                        }else{

                            console.log("nee");
                            res.send('-3');
                        }
                    }else{
                        res.send('-2')
                    }


                });

            }
        });

    }
};

exports.inviteResponse=function(req,res,next){

    var sessionId=req.body.session;
    var accepted=req.body.accepted;
    var user= req.session.email;

    console.log(req.body);

    if(sessionId){

        Session.findOne({uuid:sessionId},function(err,session){


            if(err){
                console.log('Error finding Session: '+session);
            }else{

                User.findOne({email:user},function(err,user){

                    if(err){
                        console.log('Error finding User: '+user);
                    }else if(accepted=='true' && session){

                        console.log("einladung akzeptiert");
                        session.users.push(user.email);
                        user.invitations.splice(user.invitations.indexOf(sessionId),1);
                        user.save(function(err){

                            session.save(function(err){

                                var hasPassword;
                                var permission;

                                Note.find({sessionId:session.uuid},function(err,notes){

                                    if(session.password){
                                        hasPassword=true;
                                    }else{
                                        hasPassword=false;
                                    }

                                    if(session.read.indexOf(user.email)==-1){
                                        permission='Write';
                                    }else{
                                        permission='Read';
                                    }

                                    res.send({session:session.uuid,Owner:session.owner,visibility:session.visibility,password:hasPassword,members:session.users.length,creation:session.creation,posts:notes.length});
                                    ws.addMember(session.users,user.email,user.username,session.uuid,permission);
                                });
                            });

                        });

                    }else if( accepted=='false'){

                        console.log("einladung nicht akzeptiert");
                        user.invitations.splice(user.invitations.indexOf(sessionId),1);

                        user.save(function(err){
                            res.send('-1');
                        });

                    }else{
                        user.invitations.splice(user.invitations.indexOf(sessionId),1);

                        user.save(function(err){
                            res.send('-2');
                        });

                    }
                });

            }

        });
    }

};

exports.deleteMemberFromSession=function(req,res,next){

    var user=req.body.usermail;
    var session=req.session.sessID;

    Session.findOne({uuid:session},function(err,session){

        if(session.users.indexOf(user)!=-1){
            session.users.splice(session.users.indexOf(user),1);
        }

        if(session.read.indexOf(user)!=-1){
            session.read.splice(session.read.indexOf(user),1);
        }

        session.save(function(err){
            ws.tellMember(user,session);
            ws.removeMember(session.users,session.uuid,user);
            res.send('Member Deleted');
        });
    });

};

exports.changeMemberPermission=function(req,res,next){

    var user=req.body.user;
    var session=req.body.session;
    var permission=req.body.permission;

    Session.findOne({uuid:session},function(err,session){

        if(session.read.indexOf(user)!=-1 && permission=='Write'){
            session.read.splice(session.read.indexOf(user),1);

        }else if(session.read.indexOf(user)==-1 && permission=='Read'){
            session.read.push(user);
        }

        session.save(function(err){

            ws.MemberPermissionChanged(session.uuid,user,permission);
            res.send('permission changed');
        });


    });


};

exports.setSessionPass=function(req,res,next){

    var sessionpass=req.body.sessionpass;
    var session=req.body.session;
    var owner=req.body.owner;
    var salt;
    var hash ;

    if(req.session.email==owner){
        Session.findOne({uuid:session},function(err,session){

            if(session.owner==owner && !session.password){
                salt = crypt.randomBytes(256);
                hash = crypt.createHmac("sha1",salt).update(sessionpass).digest("hex");

                session.salt=salt;
                session.password=hash;

                session.save(function(err){
                    req.session.sesspass=hash;
                    res.send('1');
                })
            }else{
                res.send('-1');
            }
        });

    }

};

exports.resetSessionPass=function(req,res,next){

    var owner=req.body.owner;
    var session=req.body.session;
    var sessionpassword=req.body.sessionpass;
    var salt;
    var hash;

    Session.findOne({uuid:session},function(err,session){

        if(session){

            salt = session.salt;
            hash = crypt.createHmac("sha1",salt).update(sessionpassword).digest("hex");

            if(hash==session.password){
                session.password=null;

                session.save(function(err){
                    res.send('1');
                });
            }else{
                res.send('-3');
            }
        }else{
            res.send('session not found');
        }
    });

};

exports.resetUnreadInvitations=function(req,res){

    var reset=req.body.reset;
    var user=req.session.email;

    if(reset){

        User.findOne({email:user},function(err,user){
            user.unread=0;
            user.save(function(err){
                res.send('ok');
            });
        });


    }
}