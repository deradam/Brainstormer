/**
 * RESTful Web services
 *
 */

var ws = require('../io/websocket');
var util = require('util');

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

    if(usermail && sessionID){

        User.findOne({email:usermail},function(err,user){



            if(!err){

                if(user.invitations.indexOf(sessionID)==-1){

                    user.invitations.push(sessionID, function(err){

                        if(!err){



                        }else{
                            next(new Error('Cannt push invitation to Session' + sessionID+' for '+usermail ));
                        }

                    });

                    user.save(function(err){

                        if(!err){
                            res.send("1");
                        }else{
                            next(new Error('Cant save invitation to Session' + sessionID+' for '+usermail ));
                        }
                    });

                }else{

                    console.log("nee");
                    res.send("-3");
                }

            }
        });

    }
}