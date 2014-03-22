/*
 * Routes for web sites
 */

var gen = require('../utils/uuid');
var mailer = require('../utils/mailer');
var util = require('util');

var Session = require('../model/model.js').Session;

exports.index = function(req, res){
    res.render('index');
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

exports.getSession = function (req, res, next) {
    var sessionId = req.params.id;
    if (sessionId) {
        Session.findOne({uuid:sessionId}, function (error, session) {
            if (error) {
                next(new Error('Error during finding session with id ' + sessionId));
            } else {
                if (session) {
                    res.render('brainstorm');
                } else {
                    res.redirect('/');
                }
            }
        });
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
    session.uuid = sessionId;
    session.creation = Date.now();
    session.post('save', function (next) {
        res.redirect('/session/' + session.uuid);
        mailer.sendMail(req.ip, session.uuid);
    });
    session.save(function (error) {
        if (!error) {
            console.log('Successfully created a new session ' + util.inspect(session));
        } else {
            next(new Error('Cannot create a new session ' + util.inspect(error)));
        }
    });
};