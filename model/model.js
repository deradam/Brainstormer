var dbconfig = require('../dbconfig.json');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// strict filtering plugin taken from
// http://tomblobaum.tumblr.com/post/10551728245/strict-filtering-plugin-for-mongoose-js
var MongooseFilter = function (schema, options) {
    options = options || {};

    schema.pre('save', function (next) {
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

var Sessions = new Schema({
    uuid: String,
    creation: Number
});

var Notes = new Schema({
    uuid: String,
    text: { type: String, default: 'No text'},
    top: Number,
    left: Number,
    creation: Number,
    color: String,
    sessionId: String
});

Notes.plugin(MongooseFilter);

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
exports.ObjectId = mongoose.Types.ObjectId;