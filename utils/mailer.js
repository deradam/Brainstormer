/**
 * Created by giemza on 11.03.14.
 */

// setting up email
var mailconfig = require('../mailconfig.json');
if (mailconfig.mail.enabled) {
    var email = require('emailjs');
    var emailserver = email.server.connect({
        user : mailconfig.mail.server.user,
        password : mailconfig.mail.server.password,
        host : mailconfig.mail.server.host,
        port : mailconfig.mail.server.port,
        tls : mailconfig.mail.server.tls
    });
}

var logger;
var nodemailer = require("nodemailer");

exports.setLogger = function setLogger(_logger) {
    logger = _logger;
}

exports.sendMail = function sendMail(ip, sessionId) {
    if (emailserver) {
        emailserver.send({
            from:'brainstormer@collide.info',
            to:"Adam Giemza <giemza@collide.info>",
            subject:'New Brainstormer Sessions',
            text:'Hi Adam,\n' +
                '\n' +
                'a new Brainstormer session has been created by IP: ' + ip + '.\n' +
                '\n' +
                'Check the Brainstormer page for the newly created session:\n' +
                '\n' +
                'http://brainstormer.collide.info/session/' + sessionId + '\n' +
                '\n' +
                'Best regards,\n' +
                ' Your Brainstormer team!'
        }, function (error, message) {
            if (error) {
                logger.info('eMail error: ' + util.inspect(error));
            } else {
                logger.info('eMail sent successfully!');
            }
        });
    }
}

// create reusable transport method (opens pool of SMTP connections)


exports.senMailToReset=function(user,tokenID){

    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: "",
            pass: ""
        }
    });

// setup e-mail data with unicode symbols
    var mailOptions = {
        from: "Brainstormer <foo@blurdybloop.com>", // sender address
        to: user, // list of receivers
        subject: "Password Reset", // Subject line
        text: 'Hi '+user+',\n' +
            '\n' +
            'Click on the Link to set up a new password:\n' +
            '\n' +
            'http://localhost:3000/reset/' + tokenID  + '\n' +
            '\n' +
            'Best regards,\n' +
            'Your Brainstormer team!'

    }



// send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, res){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + res.message);

        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });
}