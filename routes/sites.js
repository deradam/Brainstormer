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
var Token = require('../model/model.js').Token;


exports.index = function(req, res){
    res.render('index');
};



exports.loginfail=function(req,res,next){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    if(req.session.user){
        res.redirect('home');
    }else{

        res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage'),identificationhash:req.flash('identification')});
    }

};

exports.permissionFail=function(req,res,next){

    res.render('permissionfail');
};

exports.indexNew=function(req,res){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    res.render('indexNew', { message: req.flash('signupMessage'),inputerror: req.flash('inputerror')});
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

function getInvitationNamesAndRender(req,res,user,sessions,notecount){

    var invitationNames=[];
    var counterSessionNames=0;

    if(user.invitations.length>0){

        for(var j=0;j<user.invitations.length;j++){

            Session.findOne({uuid:user.invitations[j]},function(err,sessionobj){

                invitationNames.push(sessionobj.title);

                counterSessionNames=counterSessionNames+1;

                if(counterSessionNames==user.invitations.length){


                    res.render('home',{username:req.session.user,useremail:req.session.email,invitations:user.invitations,invitationNames:invitationNames,unread:user.unread,activeSession:req.session.sessID, sessions:sessions, countnotes:notecount});


                }

            });

        }

    }else{

        res.render('home',{username:req.session.user,useremail:req.session.email,invitations:user.invitations,invitationNames:invitationNames,unread:user.unread,activeSession:req.session.sessID, sessions:sessions, countnotes:notecount});



    }

}

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

            console.log(user.invitations);

            Session.find({$or:[{owner:useremail},{users:{$in:[useremail]}}]},function(err,sessions){



                if(sessions.length>0){

                    sessions.forEach(function(session){

                        Notes.find({sessionId:session.uuid}, function(err,note){

                            if(err){

                            }else{
                                if(typeof note[0]!='undefined'){
                                    notes.push({sessionid:note[0].sessionId,count:note.length});
                                }

                                count=count+1;

                                if(count==sessions.length){
                                    getInvitationNamesAndRender(req,res,user,sessions,notes);
                                }



                            }


                        });

                    });

                }else{

                    getInvitationNamesAndRender(req,res,user,[],notes);

                }

            });

        });
    }else{
        res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage'),identificationhash:req.flash('identification')});

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

exports.leaveAllSessions=function(req,res,next){

    var user=req.session.email;
    var leaveAll=req.body.leaveAll;


    if(user && leaveAll=='true'){
        Session.find({users:{$in:[user]}},function(err,sessions){

            var count=0;

            if(sessions.length>0){

                sessions.forEach(function(session){

                    if(session.users.indexOf(user)!=-1){

                        session.users.splice(session.users.indexOf(user),1);
                    }

                    session.save(function(err,session){

                        ws.removeMember(session.users,session.uuid,user);
                        count=count+1;

                        if(count==sessions.length){
                            res.send('1');
                        }
                    });



                });

            }else{
                res.send('-1');
            }

        });
    }

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
                                ws.deleteSession(session.uuid);
                            });
                        });
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

function getMemberNames(req,res,session,useremail,members,invitation){
    var count=0;

    session.users.forEach(function(user){

        User.findOne({email:user},function(err,user){
            members.push(user.username);
            count=count+1;
            user.invitations.splice(invitation);


            user.save(function(err){

                if(count==session.users.length){

                    checkLoginAndRender(req,res,session,useremail,members);

                }

            });


        });

    });

}

function checkVisibilityAndInvitation(req,res,session,useremail){

    var userindex;
    var invitation;
    var errortext=[];
    var members=[];

    if(session.visibility=='Private'){

        User.findOne({email:useremail},function(err,user){

            if(user){


                userindex=session.users.indexOf(useremail);
                invitation=user.invitations.indexOf(session.uuid);

                if(userindex!=-1 || session.owner==useremail || invitation!=-1){

                    if(session.users.length>0){

                        getMemberNames(req,res,session,useremail,members,invitation);

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

                res.render('loginFail',{ loginfailmsg: req.flash('loginfailMessage') ,message:req.flash('signupMessage'),identificationhash:req.flash('identification')});
            }

        });



    }else{

        if(useremail ){


            User.findOne({email:useremail},function(err,user){

                if(session.users.length>0){
                    getMemberNames(req,res,session,useremail,members,invitation);
                }else{
                    checkLoginAndRender(req,res,session,useremail,members);
                }

            });

        }else{
            checkLoginAndRender(req,res,session,useremail,members);
        }

    }

};

function checkLoginAndRender(req,res,session,useremail,members){

    if (session && !useremail) {

        //session.users.push('Anonym');

        //session.save();

        res.render('brainstormNew',{identificationhash:req.session.identification});

    }else if(session && useremail){


        var index=session.users.indexOf(useremail);
        var passwordflag;

        if(index==-1 && useremail!=session.owner){
            session.users.push(useremail);

            session.save(function(err){

                User.findOne({email:useremail},function(err,user){
                    members.push(user.username);
                    user.invitations.splice(user.invitations.indexOf(session.uuid),1);
                    user.unread=user.unread-1;

                    user.save(function(err){
                        ws.addMember(session.users,useremail,user.username,session.uuid,'Write');
                    });

                });

            });
        }

        if(session.password){
            passwordflag=true;
        }else{
            passwordflag=false;
        }

        console.log(members);
        console.log(session.users);

        res.render('session',{owner:session.owner,title:session.title,visibility:session.visibility,username:req.session.user,passwordset:passwordflag,userID:req.session.userID, usermail:req.session.email,members:members,membermails:session.users,read:session.read, errortext:req.flash('errMessage'), loadedsession:session.uuid});

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
    var title=req.body.sessiontitle;

    var errortext=[];
    var errortype;
    var errorsource;
    var salt;
    var identificationhash;

    req.session.sessID=sessionId;

    session.uuid = sessionId;
    session.creation = Date.now();
    session.title='No Title';
    console.log(req.body.visibility);
    session.visibility=req.body.visibility;


    if(email){

        User.findOne({email:email},function (error, user) {

            if (error) {

                next(new Error('Error finding User ' + user));

            } else {

                if(title){
                    session.title=title;
                }

                if(sessionpassword){

                    var salt = crypt.randomBytes(256);
                    var hash = crypt.createHmac("sha1",salt).update(sessionpassword).digest("hex");

                    session.password=hash;
                    session.salt=salt;

                    req.session.sesspass=hash;

                }

                session.owner=user.email;
                session.users.push(user.email);

                saveSession(req,res,next,session,identificationhash);

            }
        });

    }else{

        session.visibility='Public';

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

            if(session){


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
            }else{
                errortext.push('Session doesn'+"'"+'t exist anymore.');
                res.render('permissionfail',{errortext:errortext});
            }

        });

    }else if(backhomeBtn){

        req.session.sessID=null;

        res.redirect('/');

    }else{

        errortext.push('Please enter the Password!');
        errortype=0;
        errorsource=0;

        res.render('password',{errortext:errortext,errortype:errortype,errorsource:errorsource});

    }

};

exports.createToken=function(req,res,next){

    var user=req.body.email;
    var token=new Token();
    var salt= crypt.randomBytes(256);
    var tokenID=crypt.createHmac("sha1",salt).update(user).digest("hex");
    var hash=crypt.createHmac("sha1",salt).update(tokenID).digest("hex");

    User.findOne({email:user},function(err,user){

        if(user){
            token.user=user.email;
            token.hash=hash;
            token.salt=salt;
            token.creation=Date.now();


            token.save(function(err){
                sendMailToResetPass(res,req,user.email,hash);

            });
        }else{

            res.send('-1');

        }


    });


};

function sendMailToResetPass(res,req,user,tokenID){

    mailer.senMailToReset(user,tokenID);
    res.send('1');


};

exports.checkToken=function(req,res,next){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var date=Date.now();
    var token=req.params.token;
    req.session.token=null;
    var errortext=[];


    if(token && !req.session.token){

        Token.findOne({hash:token},function(err,token){
            if(token){

                if(!req.session.token){
                    req.session.token=token.hash;
                    res.render('passwordreset',{errortext:errortext});

                }else{
                    res.redirect('/');
                }


            }else{
                errortext.push('Token expired!');
                res.render('permissionfail',{errortext:errortext});
            }
        });

    }else{
        res.redirect('/');
    }

};

exports.saveNewPassAndRedirect=function(req,res){

    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    var newpass=req.body.newpass;
    var confirm=req.body.newpassconfirm;
    var token=req.session.token;
    var errortext=[];
    var salt;
    var hash;

    if(!newpass||!confirm){

        errortext.push('Please fill the whole Form!');
        res.render('passwordreset',{errortext:errortext});
    }else if(newpass!=confirm){

        errortext.push('Passwords not same!');
        res.render('passwordreset',{errortext:errortext});

    }else{
        Token.findOne({hash:token},function(err,token){

            if(token){

                User.findOne({email:token.user},function(err,user){

                    if(user){

                        salt= crypt.randomBytes(256);
                        hash=hash=crypt.createHmac("sha1",salt).update(newpass).digest("hex");

                        user.salt=salt;
                        user.password=hash;

                        user.save(function(err){
                            req.session.user=user.username;
                            req.session.email=user.email;
                            req.session.token=null;
                            res.redirect('/home');

                            token.remove();
                        });

                    }else{
                        req.flash('inputerror',"User doesn't exist");
                        res.redirect('/');
                    }

                });

            }else{
                errortext.push('Token expired!');
                res.render('permissionfail',{errortext:errortext});
            }


        });
    }


};

exports.changeSessionSettings=function(req,res,next){

    var sessionTitle=req.body.title;
    var visibility=req.body.visibility;
    var sessionpassword=req.body.password;
    var sessionID=req.body.sessionID;
    var toDo=req.body.todo;
    var oldPassword=req.body.oldpassword;
    var hash;
    var salt;


    Session.findOne({uuid:sessionID},function(err,session){

        if(session){

            if(session.visibility!=visibility){
                session.visibility=visibility;

                var membercopie=session.users.slice();

                if(visibility=='Public'){
                    session.visibility='Public';
                }else if(visibility=='Private'){
                    session.visibility='Private';

                    session.users=[];
                    session.users.push(session.owner);
                    session.read=[];

                }
                ws.sessionVisibilityChanged(membercopie,session.uuid,visibility);
            }

            if(sessionTitle!=session.title){
                session.title=sessionTitle;
                ws.sessionTitleChanged(session.users,session.uuid,sessionTitle);
            }

            if(toDo=='change password' ){
                var sessionsalt=session.salt;
                var hash=crypt.createHmac("sha1",sessionsalt).update(oldPassword).digest("hex");

                if(hash==session.password){
                    console.log('hierhooo');
                    var newsalt= crypt.randomBytes(256);
                    var newpass=crypt.createHmac("sha1",newsalt).update(oldPassword).digest("hex");
                    session.salt=newsalt;
                    session.password=newpass;
                    ws.setSessionPass(session.users,session.owner,session.uuid);
                    res.send('1');

                }else{
                    res.send('-3');
                }

            }else if(toDo=='set password'){


                salt= crypt.randomBytes(256);
                hash=crypt.createHmac("sha1",salt).update(sessionpassword).digest("hex");
                session.password=hash;
                session.salt=salt;
                ws.setSessionPass(session.users,session.owner,session.uuid);
                res.send('2');

            }



            session.save(function(err){

                res.send('Session Changed');
            });


        }else{
            res.send('Session doesnt exist!')
        }

    });

};



