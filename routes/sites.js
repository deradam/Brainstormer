/*
 * Routes for web sites
 */

var gen = require('../utils/uuid');
var mailer = require('../utils/mailer');
var util = require('util');
var ws = require('../io/websocket');
var Q = require('q');
var async = require('async');
var crypt = require('crypto');

var Session = require('../model/model.js').Session;
var User = require('../model/model.js').User;
var Notes = require('../model/model.js').Note;


exports.index = function(req, res){
    res.render('index');
};



exports.loginfail=function(req,res,next){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    if(req.session.user){
        res.redirect('home');
    }else{

        res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage')});
    }

};

exports.permissionFail=function(req,res,next){

    res.render('permissionfail');
};

exports.indexNew=function(req,res){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    res.render('indexNew', { message: req.flash('signupMessage') });
};

exports.brainstormNew=function(req,res){
    res.render('brainstormNew');
};

exports.home=function(req,res){

    res.render('home',{username:req.session.user});
};

exports.newSession = function (req, res, next) {

    var sessionId = req.params.sessionid;

    if (sessionId) {
        Session.findOne({uuid:sessionId}, function (error, session) {
            if (error) {
                next(new Error('Error during finding session with id ' + sessionId));
            } else {
                if (session) {
                    res.redirect('/session/' + session.uuid);
                } else {
                    createSessionAndRedirect(req, res, next, sessionId);
                }
            }
        });
    } else {
        findNewSessionIdAndCreate(req, res, next, sessionId);
    }
};

exports.getSessions=function(req,res,next){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var username=req.session.user;
    var useremail=req.session.email;
    var errortext=[];
    var errortype;
    var errorsource;
    var notes=[];
    var count=0;

    if(useremail){

        User.findOne({email:useremail},function(err,user){

            Session.find({$or:[{owner:useremail},{users:{$in:[useremail]}}]},function(err,sessions){



                if(sessions.length>0){

                    sessions.forEach(function(session){

                        Notes.find({sessionId:session.uuid}, function(err,note){

                            if(err){
                                errortext.push('Error counting Notes');
                                errortype=0;
                                errorsource=0;
                                req.flash('errortext',errortext);
                            }else{
                                if(typeof note[0]!='undefined'){
                                    notes.push({sessionid:note[0].sessionId,count:note.length});
                                }

                                count=count+1;

                                if(count==sessions.length){
                                    res.render('home',{username:req.session.user,useremail:req.session.email,invitations:user.invitations,unread:user.unread,activeSession:req.session.sessID, sessions:sessions, countnotes:notes,errortext:req.flash('errortext'),errortype:errortype,errorsource:errorsource});
                                }

                            }


                        });

                    });

                }else{

                    res.render('home',{username:req.session.user,useremail:req.session.email,invitations:user.invitations,activeSession:req.session.sessID,unread:user.unread, sessions:[], countnotes:notes,errortext:req.flash('errortext'),errortype:errortype,errorsource:errorsource});

                }

            });

        });
    }else{
        res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage')});

    }

};

exports.getSession = function (req, res, next) {

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var sessionId = req.params.id;
    var useremail= req.session.email;
    var errortext=[];
    var errortype;
    var errorsource;

    if (sessionId) {

        Session.findOne({uuid:sessionId}, function (error, session) {

            if (error) {

                next(new Error('Error during finding session with id ' + sessionId));

            } else if(session){

                req.session.sessID=sessionId;


                if(session.password){

                    if(req.session.sesspass==session.password){
                        checkVisibilityAndInvitation(req,res,session,useremail);
                    }else{
                        res.render('password',{errortext:errortext,errortype:errortype,errorsource:errorsource});
                    }

                }else{
                    checkVisibilityAndInvitation(req,res,session,useremail);
                }

            }else{

                errortext.push("Session doesn't exist anymore.")
                req.session.sessID=null;
                res.render('permissionfail',{errortext:errortext});

            }

        });


    } else {

        res.redirect('/');
    }
};

exports.deleteSession=function(req,res,next){

    var data=req.body;

    Session.findOne({uuid:data.session}, function(err,session){

        if(err){

            next(new Error('Error finding Session to delete ' + data.session));

        }else{
            session.remove(function(err){
                if(err){
                    next(new Error('Error deleting Session ' + data.session));
                }else{

                    Notes.find({sessionId:data.session}).remove(function(err){

                        if(!err){
                            res.send(data.session);
                            ws.deleteSession(data.session);
                        }
                    });

                }
            });


        }

    });

};

exports.deleteAllSessions=function(req,res,next){

    var user=req.session.email;
    var deleteAll=req.body.deleteAll;


    if(user && deleteAll=='true'){
        Session.find({$or:[{owner:user},{users:{$in:[user]}}]},function(err,sessions){

            var count=0;

            if(sessions.length>0){

                sessions.forEach(function(session){

                    if(session.owner==user){

                        session.remove(function(err){

                            Notes.find({sessionId:session.uuid}).remove(function(err){

                            });
                        });
                    }else if(session.users.indexOf(user)!=-1){
                        session.users.splice(session.users.indexOf(user),1);
                        session.save();
                    }

                    count=count+1;

                    if(count==sessions.length){
                        res.send('1');
                    }

                });

            }else{
                res.send('-1');
            }

        });
    }

};

exports.leaveSession=function(req,res,next){

    var sessionID=req.body.session;

    if(sessionID){
        Session.findOne({uuid:sessionID},function(err,session){

            if(session){
                var useremail=req.session.email;
                var index=session.users.indexOf(useremail);

                session.users.splice(index);
                if(session.read.indexOf(useremail)!=-1){
                    session.read.splice(session.users.indexOf(useremail),1);
                }

                session.save(function(err){
                    ws.removeMember(session.users,session.uuid,useremail);
                    res.send('session leaved');
                });
            }

        });
    }

};

function checkVisibilityAndInvitation(req,res,session,useremail){

    var userindex;
    var invitation;
    var errortext=[];
    var members=[];
    var count=0;

    if(session.visibility=='Private'){

        User.findOne({email:useremail},function(err,user){

            if(user){


                userindex=session.users.indexOf(useremail);
                invitation=user.invitations.indexOf(session.uuid);

                if(userindex!=-1 || session.owner==useremail || invitation!=-1){

                    if(session.users.length>0){
                    session.users.forEach(function(user){

                        User.findOne({email:user},function(err,user){
                            members.push(user.username);
                            count=count+1;

                            if(count==session.users.length){
                                user.invitations.splice(invitation);
                                user.save(function(err){

                                    checkLoginAndRender(req,res,session,useremail,members);
                                });

                            }

                        });

                    });
                    }else{
                        user.invitations.splice(invitation);


                        members.push(user.username);

                        user.save();
                        checkLoginAndRender(req,res,session,useremail,members);

                    }

                }else{
                    req.session.sessID=null;
                    errortext.push('You have no permissons to access the Session.');
                    res.render('permissionfail',{errortext:errortext});
                }

            }else{
                errortext.push('You have to Login first!');

                res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage')});
            }

        });



    }else{

        checkLoginAndRender(req,res,session,useremail,members);

    }

};

function checkLoginAndRender(req,res,session,useremail,members){

    if (session && !useremail) {

        //session.users.push('Anonym');

        //session.save();

        res.render('brainstormNew',{identificationhash:req.session.identification});

    }else if(session && useremail){


        var index=session.users.indexOf(useremail);


        if(index==-1 && useremail!=session.owner){
            session.users.push(useremail);

            session.save(function(err){

                User.findOne({email:useremail},function(err,user){
                    members.push(user.username);
                    ws.addMember(session.users,useremail,user.username,session.uuid,'Write');
                });

            });
        }

        res.render('session',{owner:session.owner,visibility:session.visibility,username:req.session.user, usermail:req.session.email,members:members,membermails:session.users,read:session.read, errortext:req.flash('errMessage'), loadedsession:session.uuid});

    } else {
        res.redirect('/');
    }

};

function findNewSessionIdAndCreate(req, res, next, sessionId) {
    if (sessionId) {
        createSessionAndRedirect(res, next, sessionId);
    } else {
        sessionId = gen.uuid(6);
        Session.findOne({uuid:sessionId}, function (error, session) {
            if (error) {
                next(new Error('Error during finding session with id ' + sessionId));
            } else {
                if (session) {
                    findNewSessionIdAndCreate(req, res, next, null);
                } else {
                    createSessionAndRedirect(req, res, next, sessionId);
                }
            }
        });
    }
};

var createSessionAndRedirect = function createSessionAndRedirect(req, res, next, sessionId) {

    var session = new Session();
    var email=req.session.email;
    var sessionpassword=req.body.sessionpassword;

    var errortext=[];
    var errortype;
    var errorsource;
    var salt;
    var identificationhash;

    req.session.sessID=sessionId;

    session.uuid = sessionId;
    session.creation = Date.now();
    session.name=req.body.sessiontitle;
    session.visibility=req.body.visibility;


    if(email){

        User.findOne({email:email},function (error, user) {

            if (error) {

                next(new Error('Error finding User ' + user));

            } else {

                if(sessionpassword){

                    var salt = crypt.randomBytes(256);
                    var hash = crypt.createHmac("sha1",salt).update(sessionpassword).digest("hex");

                    session.password=hash;
                    session.salt=salt;

                    req.session.sesspass=hash;

                }

                session.owner=user.email;
                session.users.push(user.email);

                user.save(function(err){

                    if(err){
                        console.log('Error setting Owner to Session ' + util.inspect(session));
                    }

                });

                saveSession(req,res,next,session,identificationhash);

            }
        });

    }else{

        salt= crypt.randomBytes(256);
        identificationhash = crypt.createHmac("sha1",salt).update(session.uuid).digest("hex");

        saveSession(req,res,next,session,identificationhash);


    }

};

function saveSession(req,res,next,session,identificationhash){

    session.post('save', function (next) {

        req.session.identification=identificationhash;
        res.redirect('/session/' + session.uuid);
        //mailer.sendMail(req.ip, session.uuid);
    });
    session.save(function (error) {
        if (!error) {
            console.log('Successfully created a new session ' + util.inspect(session));
        } else {
            next(new Error('Cannot create a new session ' + util.inspect(error)));
        }
    });

}

exports.checkPasswordAndRedirect=function(req,res){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var sesspassword=req.body.sessionpass;
    var passsubmitBtn=req.body.submitSessPassBtn;
    var backhomeBtn=req.body.backBtn;

    var sesspass=req.session.sesspass;
    var sessionID=req.session.sessID;
    var useremail=req.session.email;

    var errortext=[];
    var errortype;
    var errorsource;
    var salt;
    var hash;

    if(sesspassword && passsubmitBtn){

        Session.findOne({uuid:sessionID},function(err,session){

            salt=session.salt;
            hash=crypt.createHmac("sha1",salt).update(sesspassword).digest("hex");

            if(session.password==hash){

                req.session.sesspass=session.password;
                res.redirect('/session/'+sessionID);

            }else{

                errortext.push('Wrong Password!');
                errortype=0;
                errorsource=0;

                res.render('password',{errortext:errortext,errortype:errortype,errorsource:errorsource});

            }

        });

    }else if(backhomeBtn){

        req.session.sessID=null;

        res.redirect('/');

    }else{

        errortext.push('Pls enter the Password!');
        errortype=0;
        errorsource=0;

        res.render('password',{errortext:errortext,errortype:errortype,errorsource:errorsource});

    }

};

