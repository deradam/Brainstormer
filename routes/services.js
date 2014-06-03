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

exports.setNoteLock=function(req,res){

    var noteId=req.body.note_id;
    var editing=req.body.editable;
    var creator=req.body.creator;


    if(noteId){
        Note.findOne({_id:noteId},function(err,note){
            if(note){

                Session.findOne({uuid:note.sessionId},function(err,session){

                    if(session){

                        User.findOne({email:session.owner},function(err,user){
                            if(!err){

                                if(note.creator==creator || creator==user._id){
                                    if(editing=='Yes'){
                                        note.editable='Yes';
                                    }else if(editing=='No'){
                                        note.editable='No';
                                    }

                                    note.save(function(err,note){

                                        var noteInf={uuid:note.uuid,lock:editing,creator:note.creator};
                                        ws.lockNote(note.sessionId,noteInf);
                                        res.send('1');
                                    });

                                }else{
                                    res.send('-3');
                                }

                            }else{
                                res.send('User doesnt exist');
                            }
                        });



                    }else{
                        res.send('session not available');
                    }

                });



            }else{
                res.send('-2');
            }
        });
    }else{
        res.send('-1');
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
                                        invitation={user:user.email,title:session.title,session:session.uuid,unread:user.unread};
                                        ws.sendInvitation(invitation);
                                        res.send('1');
                                    }else{
                                        next(new Error('Cant save invitation to Session' + sessionID+' for '+usermail ));
                                    }

                                });

                            });


                        }else{


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

                                    res.send({session:session.uuid,title:session.title,Owner:session.owner,visibility:session.visibility,password:hasPassword,members:session.users.length,creation:session.creation,posts:notes.length});
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
                    ws.setSessionPass(session.users,owner,session.uuid);
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
                session.password='';

                session.save(function(err){
                    ws.sessionPassRemoved(session.users,session.owner,session.uuid);
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

exports.changeUserPass=function(req,res,next){

    var user=req.session.email;
    var newPass=req.body.newpass;
    var oldpass=req.body.oldpass
    var salt;
    var hash;

    User.findOne({email:user},function(err,user){

        console.log('gefunden');
        if(user){

            salt = user.salt;
            hash = crypt.createHmac("sha1",salt).update(oldpass).digest("hex");

            if(user.password==hash){
                var newsalt = crypt.randomBytes(256);
                var newhash = crypt.createHmac("sha1",newsalt).update(newPass).digest("hex");

                user.salt=newsalt;
                user.password=newhash;

                user.save(function(err){

                    res.send('1');

                });

            }else{
                res.send('-3');
            }

        }
    });

};

exports.changeVisibility=function(req,res,next){

    var visibility=req.body.visibility;
    var session=req.body.session;
    var membercopie;

    Session.findOne({uuid:session},function(err,session){

        if(session){

            membercopie=session.users.slice();

            if(visibility=='Public'){
                session.visibility='Public';
            }else if(visibility=='Private'){
                session.visibility='Private';

                session.users=[];
                session.users.push(session.owner);
                session.read=[];

            }

            session.save(function(err){
                res.send('1');
                ws.sessionVisibilityChanged(membercopie,session.uuid,visibility);

            });

        }else{
            res.send('-1');
        }

    });

};

exports.getSessionOwnerID=function(req,res){
    var sessionID=req.body.sessionID;

    if(sessionID){

        Session.findOne({uuid:sessionID},function(err,session){
            if(session){

                User.findOne({email:session.owner},function(err,user){
                    if(user){

                        res.send(user._id);

                    }else{
                        res.send('-1')
                    }
                });

            }else{
                res.send('-2');
            }
        });

    }else{
        res.send('-3');
    }
}

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
};

exports.changeSessionTitle=function(req,res,next){

    var newTitle=req.body.newTitle;
    var sessionId=req.body.sessionID;

    Session.findOne({uuid:sessionId},function(err,session){

        if(session){

            if(newTitle.length>0){
                session.title=newTitle;
            }else{
                session.title='No Title';
            }

            session.save(function(err,session){
                ws.sessionTitleChanged(session.users,session.uuid,session.title);
                res.send('1');
            });
        }else{
            res.send('session not existing')
        }
    });
}

exports.searchPosts=function(req,res,next){

    var useremail=req.session.email;
    var text=req.body.text;
    var sessionIDs=[];
    var counter=0;

    if(useremail && text){

        Session.find({$or:[{owner:useremail},{users:{$in:[useremail]}}]},function(err,sessions){

            if(sessions.length >0){

                sessions.forEach(function(session){



                    if(session){

                        Note.findOne({$and:[{sessionId:session.uuid},{text:{$regex : ".*"+text+".*"}}]},function(err,note){

                            counter=counter+1;
                            if(note){

                                    sessionIDs.push(note.sessionId);

                            }

                            if(counter==sessions.length){
                                console.log(sessionIDs);

                                if(sessionIDs.length>0){
                                    res.send({sessions:sessionIDs});
                                }else{
                                    res.send('no Note found');
                                }

                            }


                        });

                    }else{
                        res.send('session deleted');
                    }

                });

            }else{
                res.send('0');
            }



        });

    }else{
        res.send('-1');
    }
}