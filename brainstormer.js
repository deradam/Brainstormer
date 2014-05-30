// setting up logging
var log4js = require('log4js');
log4js.replaceConsole();
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('brainstormer.log'));
var logger = log4js.getLogger();
logger.setLevel('DEBUG');

require('./model/model').init(logger);
require('./utils/mailer').setLogger(logger);
require('./io/websocket').setLogger(logger);

var flash 	 = require('connect-flash');


// setting up the web server
var express = require('express');
var app = express();
var path = require('path');
var passport = require('passport');
var passp=require('./routes/passport');
var fs = require('fs');




// importing mongodb-based session store
var MongoStore = require('connect-mongo')(express);

app.configure(function () {

    app.use(log4js.connectLogger(logger, { level:log4js.levels.INFO }));
    app.set('view engine', 'ejs');
    app.set('view options', {layout:false});
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.cookieParser());

    app.use(passport.initialize());
    app.use(flash());


});

app.configure('development', function () {
    app.use(express.cookieSession({secret:'mySecret',store:express.session.MemoryStore({reapInterval: 60000 * 10})} ));
    //app.use(express.session({secret:'s3cr3t'}));
    //app.use(express.static(__dirname + '/public'));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(passport.session()); // persistent login sessions
    app.use(app.router);
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));

});

app.configure('production', function () {
    app.use(express.session({secret:'c0ll1d3', store: new MongoStore({ db: 'sessionstore' })}));
//    app.use(require('express-uglify').middleware({ src: __dirname + '/public' }));
    var oneYear = 31557600000;
    app.use(express.static(path.join((__dirname + '/public', {maxAge:oneYear}))));
    app.use(app.router);
    app.use(express.errorHandler());
    app.enable('trust proxy');
});



// setting up server
logger.info('Server listening on localhost:3000');
var server = app.listen(8080);

// setting up the websocket connection
var io = require('./io/websocket');
io.listen(server);

// finally the routes
var routes = require('./routes');

// site

//app.get('/indexNew', routes.sites.indexNew);
//app.get('/brainstormNew', routes.sites.brainstormNew);
//app.get('/', routes.sites.index);
//app.get('/session/new/:sessionid?', routes.sites.newSession);
//app.get('/session/:id', routes.sites.getSession);

app.get('/landingpage',function(req,res){

    res.render('landing-Page');
});

app.get('/',passp.checkAuth, routes.sites.indexNew);
app.post('/session/new/:sessionid?', routes.sites.newSession);
app.get('/session/:id', routes.sites.getSession);
app.post('/session/delete',routes.sites.deleteSession);
app.post('/session/leave',routes.sites.leaveSession);
app.post('/session/setpassword',routes.services.setSessionPass);
app.post('/session/resetPassword',routes.services.resetSessionPass);
app.post('/session/visibility',routes.services.changeVisibility);

app.get('/reset/:token?',routes.sites.checkToken);
app.post('/user/resetpass',routes.sites.createToken);
app.post('/user/savenewpass',routes.sites.saveNewPassAndRedirect);
app.post('/user/sessionowner',routes.services.getSessionOwnerID);

app.post('/checkpermission',routes.sites.checkPasswordAndRedirect);
app.post('/user/invite',routes.services.inviteUserToSession);
app.post('/user/remove',routes.services.deleteMemberFromSession);
app.post('/user/changepermission',routes.services.changeMemberPermission);
app.post('/user/inviteresponse',routes.services.inviteResponse);
app.post('/user/changepassword',routes.services.changeUserPass);
app.post('/invitationscounter/reset',routes.services.resetUnreadInvitations);
app.post('/sessions/remove',routes.sites.deleteAllSessions);
app.post('/sessions/leave',routes.sites.leaveAllSessions);
app.post('/session/settings/change',routes.sites.changeSessionSettings);
app.post('/session/title',routes.services.changeSessionTitle);

app.post('/signup', passp.signUp,routes.sites.loginfail);
app.post('/login',passp.logIn,routes.sites.loginfail);
app.get('/logout',passp.logOut);
app.get('/home',routes.sites.getSessions);


// services
app.get('/notes/:sessionId', routes.services.getNotes);
app.post('/notes/new', routes.services.postNewNote);
app.get('/note/:id', routes.services.getNoteById);
app.post('/notes/update/:id', routes.services.updateNote);
app.post('/notes/delete/:id', routes.services.deleteNote);
app.post('/note/setedit',routes.services.setNoteLock);

