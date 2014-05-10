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

    req.session.sessID=null;


    if(username){

                Session.find({$or:[{owner:useremail},{users:{$in:[useremail]}}]},function(err,sessions){

                    var notes=[];
                    var count=0;


                    if(sessions.length>0){


                        sessions.forEach(function(session){



                            Notes.find({sessionId:session.uuid}, function(err,note){

                                if(err){
                                    errortext.push('Error counting Notes')
                                    errortype=0;
                                    errorsource=0;
                                    req.flash('errortext',errortext);
                                }else{

                                    if(typeof note[0]!='undefined'){
                                        notes.push({sessionid:note[0].sessionId,count:note.length});
                                    }

                                    count=count+1;
                                    if(count==sessions.length){

                                        res.render('home',{username:req.session.user,useremail:req.session.email, sessions:sessions,countnotes:notes,errortext:req.flash('errortext'),errortype:errortype,errorsource:errorsource});
                                    }

                                }


                            });

                        });


                    }else{

                        res.render('home',{username:req.session.user,useremail:req.session.email, sessions:sessions,countnotes:notes,errortext:req.flash('errortext'),errortype:errortype,errorsource:errorsource});

                    }


                });


    }else{
        res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage')});

    }

};

exports.getSession = function (req, res, next) {

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var sessionId = req.params.id;


    if (sessionId) {
        Session.findOne({uuid:sessionId}, function (error, session) {
            if (error) {
                next(new Error('Error during finding session with id ' + sessionId));
            } else {
                if (session && !req.session.user) {

                    req.session.sessID=sessionId;
                    res.render('brainstormNew',{identificationhash:req.session.identification});

                }else if(session && req.session.user){

                    req.session.sessID=sessionId;

                    Session.find({$or:[{owner:req.session.email},{users:{$in:[req.session.email]}}]},function(err,sessions){


                        if(sessions){

                            res.render('session',{username:req.session.user, sessions:sessions, errortext:req.flash('errMessage'), loadedsession:sessionId});
                        }
                    });


                } else {
                    res.redirect('/');
                }
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

    req.session.sessID=sessionId;
    console.log(req.body);

    session.uuid = sessionId;
    session.creation = Date.now();
    session.title=req.body.sessiontitle;
    session.visibility=req.body.visibility;


    if(email){

        User.findOne({email:email},function (error, user) {
            if (error) {
                next(new Error('Error during finding User ' + user));
            } else {

                if(sessionpassword){

                    var salt = crypt.randomBytes(256);
                    var hash = crypt.createHmac("sha1",salt).update(sessionpassword).digest("hex");
                    session.password=hash;
                    session.salt=salt;

                }

                session.owner=user.email;

                user.save(function(err){
                    console.log('Error setting Owner to Session ' + util.inspect(session));
                });

                session.post('save', function (next) {

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
        });

    }else{

        var salt = crypt.randomBytes(256);
        var identificationhash = crypt.createHmac("sha1",salt).update(session.uuid).digest("hex");

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

};