var dbconfig = require('../dbconfig.json');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ttl = require('mongoose-ttl');

// strict filtering plugin taken from
// http://tomblobaum.tumblr.com/post/10551728245/strict-filtering-plugin-for-mongoose-js
var MongooseFilter = function (schema, options) {
    options = options || {};

    schema.pre('save', function (next) {
        this.filter();
        next();
    });

    schema.pre('remove', function (next) {
        this.filter();
        next();
    });

    schema.method('filter', function () {
        var self = this;
        var paths = schema.paths;
        if (!'_id' in paths) paths['_id'] = '';
        for (var key in this._doc) {
            if (!(key in paths)) {
                delete this._doc[key];
                if (options.debug) console.log('Warn: Cannot put ' + key + ' in ' + this.constructor.modelName);
            }
        }
        return this;
    });

};

var user = new Schema({
    username:String,
    password: String,
    email:String,
    salt:Buffer,
    publicSessions:[Sessions],
    privateSessions:[Sessions],
    invitations:[],
    unread:Number

});

var Sessions = new Schema({
    uuid: String,
    creation: Number,
    name: String,
    visibility: String,
    password:String,
    salt:Buffer,
    owner: String,
    users:[String],
    read: [String]

});

var Notes = new Schema({
    uuid: String,
    text: { type: String, default: 'No text'},
    top: Number,
    left: Number,
    creation: Number,
    creator: String,
    editable: String,
    color: String,
    sessionId: String
});

var Token=new Schema({
    hash:String,
    creation:String,
    salt:Buffer,
    user:String

});

Notes.plugin(MongooseFilter);
Token.plugin(ttl, { ttl: '1m' ,interval:'5s'});



exports.init = function (logger) {
    var credentials = '';
    if (dbconfig.username && dbconfig.password) {
        credentials = dbconfig.username + ':' + dbconfig.password + '@';
    }
    mongoose.connect('mongodb://' + credentials + dbconfig.host + ':' + dbconfig.port + '/' + dbconfig.database, {}, function (error, db) {
        if (error) {
            logger.fatal('ERROR connecting to database: ' + error.message);
            process.exit(0);
        } else {
            logger.debug('Successfully connected to db');
        }
    });
}

exports.Note = mongoose.model('notes', Notes);
exports.Session = mongoose.model('sessions', Sessions);
exports.User = mongoose.model('user',user);
exports.Token = mongoose.model('token',Token);
exports.ObjectId = mongoose.Types.ObjectId;
