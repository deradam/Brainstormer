// socket.io socket reference
var socket;


$('document').ready(function () {
    var url = window.location.href;
    var sessionId = url.substring(url.lastIndexOf('/') + 1, url.length);
    if (!sessionId) {
        window.location.replace('http://brainstormer.collide.info');
    } else {
        sessionStorage.sessionId = sessionId;




    }
    var desk = $('#desk');

    var clickTimer = 0;
    desk.on('click', function (e) {
        $('.selected').removeClass('selected');
        $('.locked').removeClass('locked');
        if (e.originalEvent.detail === 1) {
            clickTimer = setTimeout(function() {

                updateSelection();
            }, 250);
        }
    });
    $(window).keydown(function (event) {
        var source = event.target.tagName.toLowerCase();
        var actualUser=$('#userID').val();
        var creatorOfselectedNote=$('.selected').attr('creator');
        var editable=$('.selected').attr('editable');
        var permissionRead=$('#noteinput').attr('disabled');
        if (source != "input" && source != "textarea" ) {

            if(!$('#userID').val()){
                if(editable=='Yes' && (event.which == 8 || event.which == 46)){
                    event.stopPropagation();
                    event.preventDefault();
                    removeSelectedNote();
                }else if (event.which == 27) {
                    event.stopPropagation();
                    event.preventDefault();
                    resetSearch();
                }
            }
            else if ((event.which == 8 || event.which == 46) && ((!permissionRead &&(editable=='Yes' || creatorOfselectedNote==actualUser)) || actualUser==sessionOwnerID )   ) {

                event.stopPropagation();
                event.preventDefault();
                removeSelectedNote();
            } else if (event.which == 27) {
                event.stopPropagation();
                event.preventDefault();
                resetSearch();
            }
        }
    });

    $('#colorpalette1').colorPalette()
        .on('selectColor', function(e) {

            var actualUser=$('#userID').val();
            var contribution = $('.selected');
            if (contribution.length > 0 && (contribution.attr('editable')=='Yes' || actualUser==sessionOwnerID)) {
                getNoteColored(contribution.find('section'), e.color);
                var _id = $(contribution).attr('_id');
                $.post('/notes/update/' + _id, {color: e.color});
            }

            //alert(e.color);
     });





    $('div#add').on('click', addNote);
    $('div#white').on('click', function () {
        var contribution = $('.selected');
        if (contribution.length > 0) {
            colorNote(contribution.find('section'), 'white');
            var _id = $(contribution).attr('_id');
            $.post('/notes/update/' + _id, {color:'white'});
        }
    });
    $('div#red').on('click', function () {
        var contribution = $('.selected');
        if (contribution.length > 0) {
            colorNote(contribution.find('section'), 'red');
            var _id = $(contribution).attr('_id');
            $.post('/notes/update/' + _id, {color:'red'});
        }
    });
    $('div#blue').on('click', function () {
        var contribution = $('.selected');
        if (contribution.length > 0) {
            colorNote(contribution.find('section'), 'blue');
            var _id = $(contribution).attr('_id');
            $.post('/notes/update/' + _id, {color:'blue'});
        }
    });
    $('div#yellow').on('click', function () {
        var contribution = $('.selected');
        if (contribution.length > 0) {
            colorNote(contribution.find('section'), 'yellow');
            var _id = $(contribution).attr('_id');
            $.post('/notes/update/' + _id, {color:'yellow'});
        }
    });
    $('div#delete').on('click', function () {

            removeSelectedNote();


    });



    $('input[name="topic"]').keyup(function (event) {
        var code = event.which;
        //event.stopPropagation();
        if (code == 13) {
            addNote();
        }
    });
    $('input[type="search"]').on('click', function () {
        if (this.value == '') {
            resetSearch();
        }
    });
    $('input[type="search"]').keyup(function (event) {


        event.stopPropagation();
        if (event.which == 27) {
            resetSearch();
        } else {
            var text = $('input[type="search"]').val();

            if(text=='my posts'){

                var contributions = $('.contribution');
                contributions.removeClass('matching');
                contributions.removeClass('notmatching');

                $('.contribution[creator='+$('#userID').val()+']').removeClass('notmypost');
                $('.contribution[creator='+$('#userID').val()+']').addClass('mypost');

                $('.contribution:not([creator='+$('#userID').val()+'])').removeClass('mypost');
                $('.contribution:not([creator='+$('#userID').val()+'])').addClass('notmypost');

            }else{
                if (text.length > 0) {


                    var matching = $('.contribution:contains(' + text + ')');
                    matching.removeClass('notmatching');
                    matching.addClass('matching');
                    var notmatching = $('.contribution:not(:contains(' + text + '))');
                    notmatching.removeClass('matching');
                    notmatching.addClass('notmatching');


                } else {
                    var contributions = $('.contribution');
                    contributions.removeClass('matching');
                    contributions.removeClass('notmatching');
                    contributions.removeClass('mypost');
                    contributions.removeClass('notmypost');
                }
            }



        }
    });





    $('#inviteBtn').on('click',function(){

        $(this).attr('disabled',true);
        window.setTimeout(function() { $(".alert").fadeOut(500,function(){$('#inviteBtn').removeAttr('disabled');}); },600);

        var userMail=$('#userMail').val();

        var permission=$.trim($('#permissionBtn').text());

        if(userMail && permission!='Permission'){

            $.post('/user/invite',{usermail:userMail,sessionID:sessionId,permission:permission}, function(response){
                $('.alert').remove();
                if(response==-3 && !$('#inviteUserLabel').next().attr('id')){
                    $('.alert').remove();
                    $('#inviteUserLabel').after('<div  class="alert alert-danger alert-dismissable text-center">Already Invited! </div>').fadeIn();
                }

                if(response==-2 && !$('#inviteUserLabel').next().attr('id')){
                    $('.alert').remove();
                    $('#inviteUserLabel').after('<div  class="alert alert-danger alert-dismissable text-center">User doesnt exist!  </div>');
                }


                if(response==1){
                    $('.alert').remove();
                    $('#inviteUserLabel').after('<div  class="alert alert-success text-center"> User invited!  </div>');
                    window.setTimeout(function() { $('#modal-container-inviteUser').modal('hide')},500);
                }

            });

        }else if(!userMail && !$('#inviteUserLabel').next().attr('id')){
            $('#inviteUserLabel').after('<div class="alert alert-danger text-center">Please set User E-Mail! </div>');

        }else if(permission=='Permission'){
            $('#inviteUserLabel').after('<div class="alert alert-danger text-center">Please set Permission! </div>');

        }
    });

    var clickedMember;
    $('#members').on('click','li',function(){
        clickedMember=$(this).attr('data-text');
    });

    $('#removeUserBtn').on('click',function(){

        $.post('/user/remove',{usermail:clickedMember});
        $('#modal-container-userSettings').modal('hide');

    });



    $('#changeSettings').on('click',function(){

        window.setTimeout(function() { $(".alert").fadeOut(600); },500);

        var permission= $.trim($('#permissionBtn').text());

        if(permission=='Permission'){

            $('#UserSettingsLabel').after('<div class="alert alert-danger text-center">Please set Permission! </div>');
        }else{
            $.post('/user/changepermission',{user:clickedMember,session:sessionId,permission:permission},function(){
                $('#UserSettingsLabel').after('<div  class="alert alert-success text-center"> Changed Permission! </div>');
                window.setTimeout(function() { $('#modal-container-userSettings').modal('hide')},1000);

            });
        }
    });



    $('#sessionPassBtn').on('click',function(){

        $(this).attr("disabled", true);

        window.setTimeout(function() { $(".alert").fadeOut(600,function(){$('#sessionPassBtn').removeAttr('disabled');}); },500);
        var sessionpassword= $.trim($('#sessionPass').val());
        var sessionpasswordrtp= $.trim($('#sessionPassRtp').val());
        var owner=$('#usermail').val();


        if(!sessionpassword || !sessionpasswordrtp){

            $('#setPasswordLabel').after('<div class="alert alert-danger text-center">Please set Password! </div>');

        }else if(sessionpassword==sessionpasswordrtp){

            $.post('/session/setpassword',{session:sessionId,sessionpass:sessionpassword,owner:owner});
            $('#setPasswordLabel').after('<div class="alert alert-success text-center">Password has been set! </div>');

            window.setTimeout(function() { $('#modal-container-setPasswordtoSession').modal('hide'); },500);


            $('#lockSession').addClass('hide');
            $('#unlockSession').removeClass('hide');
        }else{
            $('#setPasswordLabel').after('<div class="alert alert-danger text-center">Passwords not same! </div>');
        }

    });

    $('#unlockSessionBtn').on('click',function(){

        $(this).attr('disabled',true);
        window.setTimeout(function() { $(".alert").fadeOut(600,function(){$('#unlockSessionBtn').removeAttr('disabled');}); },500);

        var sessionpass=$('#currentPass').val();
        var owner=$('#usermail').val();

        if(!sessionpass){
            $('#unlockSessionTitle').after('<div class="alert alert-danger text-center">Passwords not set!</div>');
        }else{
            $.post('/session/resetPassword',{session:sessionId,owner:owner,sessionpass:sessionpass},function(result){
                if(result=='1'){

                    $('#lockSession').removeClass('hide');
                    $('#unlockSession').addClass('hide');

                    $('#unlockSessionTitle').after('<div class="alert alert-success text-center">Session unlocked!</div>');

                    window.setTimeout(function() { $('#modal-container-unlockSession').modal('hide'); },500);

                }else if(result=='-3'){
                    $('#unlockSessionTitle').after('<div class="alert alert-danger text-center">Passwords not correct!</div>');
                }
            });
        }

    });

    $('#changeAccPassBtn').on('click',function(){
        $(this).attr("disabled", true);
        window.setTimeout(function() { $(".alert").fadeOut(500,function(){$('#changeAccPassBtn').removeAttr('disabled');}); },600);

        var oldpass=$('#oldPass').val();
        var newpass=$('#newPass').val();
        var owner=$('#usermail').val();

        if(!oldpass || !newpass){
            $('#changePassTitle').after('<div class="alert alert-danger text-center">Please fill in both fields!</div>');
        }else{

            $.post('/user/changepassword',{user:owner,oldpass:oldpass,newpass:newpass},function(result){

                if(result=='1'){
                    $('#changePassTitle').after('<div class="alert alert-success text-center">Password changed!</div>');
                    window.setTimeout(function() { $('#modal-container-changeAccountPass').modal('hide')},600);
                }else if(result=='-3'){
                    $('#changePassTitle').after('<div class="alert alert-danger text-center">Password incorrect!</div>');

                }
            });

        }
    });

    $('#modal-container-renameSession').on('show.bs.modal', function (e) {
        $('#sessionNameNew').val($('#sessionTitle').attr('title'));
    })

    $('#changeSessionTitleBtn').on('click',function(){
        var newTitle= $.trim($('#sessionNameNew').val());
        $('#modal-container-renameSession').modal('hide');

        $.post('/session/title',{sessionID:sessionId,newTitle:newTitle});
    });

    $('#setToPublicBtn').on('click',function(){

        $('#setSessionPublic').addClass('hide');
        $('#setSessionPrivate').removeClass('hide');
        $.post('/session/visibility',{visibility:'Public',session:sessionId},function(result){
            $('#modal-container-changeToPublic').modal('hide');
        });

    });

    $('#setToPrivateBtn').on('click',function(){

        $('#setSessionPublic').removeClass('hide');
        $('#setSessionPrivate').addClass('hide');
        $.post('/session/visibility',{visibility:'Private',session:sessionId},function(result){
            $('#modal-container-changeToPublic').modal('hide');
        });

    });

    $('#editableBtn').on('click',function(){


        //$('.contribution[creator=' + $('#userID').val() + ']').addClass('selected');



        var noteId=$('.selected').attr('_id');
        var creator=$('#userID').val();


        $.post('/note/setedit',{note_id:noteId,editable:'Yes',creator:creator},function(result){


            if(result=='-3'){
                var stack_context = {"dir1": "down", "dir2": "left", "context": $('.selected')};

                new PNotify({

                    text: 'Not your Post!',
                    stack:stack_context,
                    styling: "bootstrap3",
                    shadow: false,
                    delay: 1000,
                    type: 'error',
                    icon: 'glyphicon glyphicon-edit'


                });
            }

            if(result=='1'){

                $('.selected').attr('editable','Yes');

                var stack_context = {"dir1": "down", "dir2": "left", "context": $('.selected')};

                new PNotify({

                    text: 'Contribution is editable!',
                    stack:stack_context,
                    styling: "bootstrap3",
                    shadow: false,
                    delay: 1000,
                    type: 'success',
                    icon: 'glyphicon glyphicon-edit'


                });

            }

        });

    });



    $('#noteditableBtn').on('click',function(){


        //$('.contribution[creator=' + $('#userID').val() + ']').addClass('selected');

        var noteId=$('.selected').attr('_id');
        var creator=$('#userID').val();
        $.post('/note/setedit',{note_id:noteId,editable:'No',creator:creator},function(result){
            if(result=='-3'){
                var stack_context = {"dir1": "down", "dir2": "left", "context": $('.selected')};

                new PNotify({

                    text: 'Not your Post!',
                    stack:stack_context,
                    styling: "bootstrap3",
                    shadow: false,
                    delay: 1000,
                    type: 'error',
                    icon: 'glyphicon glyphicon-edit'

                });
            }

            if(result=='1'){
                $('.selected').attr('editable','No');

                var stack_context = {"dir1": "down", "dir2": "left", "context": $('.selected')};

                new PNotify({

                    text: 'Contribution is locked!',
                    stack:stack_context,
                    styling: "bootstrap3",
                    shadow: false,
                    delay: 1000,
                    type: 'success',
                    icon: 'glyphicon glyphicon-edit'


                });

            }
        });
    });

    var sessionOwnerID;

    $.post('/user/sessionowner',{sessionID:sessionId},function(sessionOwner){
        sessionOwnerID=sessionOwner;
    });

    $.get('/notes/' + sessionStorage.sessionId, function (notes) {
        $.each(notes, function (index, note) {
            var date = new Date(note.creation);
            // fallback for old notes without uuid
            note.uuid = note.uuid || Math.uuid();

            var contribution = addContribution(note.uuid, formatDate(date), note.text, note.left, note.top, note.color,note.editable);
            limitCoordinates(contribution, null, null);
            contribution.attr('_id', note._id);
            contribution.attr('editable', note.editable);
            contribution.attr('creator', note.creator);

            if($('#userID').val()!=sessionOwnerID ){


                if($('#noteinput').attr('disabled')){

                    $('.contribution[uuid="'+note.uuid+'"] > section').editable('disable');
                    $('.contribution[uuid="'+note.uuid+'"]').draggable('disable');

                }else if(!$('#userID').val()){

                    if(note.editable=='Yes'){
                        $('.contribution[uuid="'+note.uuid+'"] > section').editable('enable');
                        $('.contribution[uuid="'+note.uuid+'"]').draggable('enable');
                    }else{

                        $('.contribution[uuid="'+note.uuid+'"] > section').editable('disable');
                        $('.contribution[uuid="'+note.uuid+'"]').draggable('disable');

                    }


                }else if( (note.editable=='Yes' || note.creator==$('#userID').val() ) ){

                    $('.contribution[uuid="'+note.uuid+'"] > section').editable('enable');
                    $('.contribution[uuid="'+note.uuid+'"]').draggable('enable');

                }else {
                    $('.contribution[uuid="'+note.uuid+'"] > section').editable('disable');
                    $('.contribution[uuid="'+note.uuid+'"]').draggable('disable');

                }

            }else{

                $('.contribution[uuid="'+note.uuid+'"] > section').editable('enable');
                $('.contribution[uuid="'+note.uuid+'"]').draggable('enable');

            }



        });


    });

    // socket.io configuration
    socket = io.connect('http://' + window.location.hostname + (window.location.port === '' ? '' : ':' + window.location.port));
    
    socket.on('connect', function() {
        var data={user:$('#usermail').val(),session:sessionId};
        socket.emit('join session', data);
    });

    socket.on('session deleted',function(sessionID){
        window.location.reload(true);
    });

    socket.on('visibility changed',function(data){

        window.location.reload(true);
    });

    socket.on('title changed',function(data){

        var title=data.title;

        $('#sessionTitle').attr('title',title);

        if(title.length>15){
            title=data.title.substring(0,12)+'...';
        }

        $('#sessionTitle > a ').empty().append('<span class="glyphicon glyphicon glyphicon-th-large"></span>'+title);
    });



    socket.on('member accepted',function(member){

        var permissionsymbol;

        if(member.permission=='Read'){
            permissionsymbol='<span class="glyphicon glyphicon-eye-open"></span>';
        }else{
            permissionsymbol='<span class="glyphicon glyphicon-pencil"></span>';
        }

        var test= '<li > <a href=""  data-toggle="modal" data-target="#modal-container-userSettings"><span class="glyphicon glyphicon-user pull-left"></span>'+member.user+permissionsymbol+'  </a> </li>';

        $('#members').prepend('<li data-text="'+member.user+'"> <a href=""  data-toggle="modal" data-target="#modal-container-userSettings"><span class="glyphicon glyphicon-user pull-left"></span>'+member.username+' '+permissionsymbol+'  </a> </li>');


     });

    socket.on('member leaved',function(member){


        $('li[data-text="'+member.usermail+'"]').remove();
    });

    socket.on('No more Access',function(){

        window.location.reload(true);

    });

    socket.on('password set',function(data){
        window.location.reload(true);
    });

    socket.on('password removed',function(){

        $('.lockSymbol').hide();

    });

    socket.on('Permission Changed',function(message){

        var actualUser=$('#usermail').val();
        var userID=$('#userID').val();

        if(message.permission=='Read'){

            if(actualUser==message.user){

                $('#noteinput').prop('disabled',true);

                $('#colorPaletteBtn').addClass('link-disabled');
                $('#colorPaletteBtn > a').removeAttr('href');
                $('#colorPaletteBtn > a').attr('data-toggle','');

                $('#editNoteBtn').addClass('link-disabled');
                $('#editNoteBtn > a').removeAttr('href');
                $('#editNoteBtn > a').attr('data-toggle','');


                $('.contribution > section').each(function(i,obj){

                    $(obj).editable('disable');
                });


                $('.contribution').draggable('disable');
            }

            $('#members > li[data-text="'+message.user+'"] > a').children().eq(1).removeClass().addClass('glyphicon glyphicon-eye-open');

        }else if(message.permission=='Write'){

            if(actualUser==message.user){



                $('#noteinput').prop('disabled',false);

                $('#colorPaletteBtn').removeClass('link-disabled');
                $('#colorPaletteBtn > a').attr('href','""');
                $('#colorPaletteBtn > a').attr('data-toggle','dropdown');

                $('#editNoteBtn').removeClass('link-disabled');
                $('#editNoteBtn > a').attr('href','""');
                $('#editNoteBtn > a').attr('data-toggle','dropdown');

                $('.contribution > section').each(function(i,obj){



                    if($(obj).parent().attr('creator')==userID || $(obj).parent().attr('editable')=='Yes'){
                        $(obj).editable('enable');
                        $(obj).parent().draggable('enable');
                    }else{
                        $(obj).editable('disable');
                        $(obj).parent().draggable('disable');
                    }

                });



            }
            $('#members > li[data-text="'+message.user+'"] > a').children().eq(1).removeClass().addClass('glyphicon glyphicon-pencil');

        }

    });
    
    socket.on('note added', function(note) {


        // check if we cannot find that element already (otherwise we have added it ourselves)
        if ($('.contribution[uuid=' + note.uuid + ']').length == 0) {
            var contribution = addContribution(note.uuid, formatDate(note.creation), note.text, note.left, note.top, note.color,note.editable);
            contribution.attr('editable', note.editable);
            limitCoordinates(contribution, null, null);
            contribution.attr('_id', note._id);
            contribution.attr('creator', note.creator);


            if($('#noteinput').attr('disabled')){
                $('.contribution[_id=' + note._id + '] > section').editable('disable');
                $('.contribution[_id=' + note._id + ']').draggable('disable');

            }
        }
    });



    socket.on('note updated', function(note) {
        var contribution = $('.contribution[uuid=' + note.uuid + ']');
        if (!contribution.hasClass('ui-draggable-dragging')) {
            $(contribution).css({left:note.left, top:note.top});
            limitCoordinates(contribution);
        }
        if ($(contribution).find('textarea').length == 0) {
            $(contribution).find('section').html(note.text);
        }
        if (note.color) {
            getNoteColored(contribution.find('section'), note.color);
        }
    });

    socket.on('note removed', function(note) {
        var contribution = $('.contribution[uuid=' + note.uuid + ']');
        $(contribution).fadeOut(500, function () {
            $(contribution).remove();
        });
    });

    socket.on('note lock',function(note){

        var userID=$('#userID').val();

        if(note.lock=='Yes'){
            $('.contribution[uuid=' + note.uuid + ']').attr('editable','Yes');
            $('.contribution[uuid=' + note.uuid + ']').removeClass('locked');

        }else if(note.lock=='No'){
            $('.contribution[uuid=' + note.uuid + ']').attr('editable','No');
            $('.contribution[uuid=' + note.uuid + ']').removeClass('selected');
            $('.contribution[uuid=' + note.uuid + ']').addClass('locked');
            $('.contribution[uuid=' + note.uuid + ']').addClass('selected');
        }

        if((note.creator!=userID && userID!=sessionOwnerID) || !userID){

            if(note.lock=='Yes'){
                $('.contribution[uuid=' + note.uuid + ']').attr('editable','Yes').draggable('enable');
                $('.contribution[uuid=' + note.uuid + '] > section').editable('enable');

                var stack_context = {"dir1": "down", "dir2": "left", "context": $('.contribution[uuid=' + note.uuid + ']')};

                new PNotify({

                    text: 'Contribution unlocked!',
                    stack:stack_context,
                    styling: "bootstrap3",
                    shadow: false,
                    delay: 1000,
                    type: 'info',
                    icon: 'glyphicon glyphicon-edit'

                });
            }else if(note.lock=='No'){

                $('.contribution[uuid=' + note.uuid + ']').attr('editable','No').draggable('disable');
                $('.contribution[uuid=' + note.uuid + '] > section').editable('disable');

                var stack_context = {"dir1": "down", "dir2": "left", "context": $('.contribution[uuid=' + note.uuid + ']')};

                new PNotify({

                    text: 'Contribution locked!',
                    stack:stack_context,
                    styling: "bootstrap3",
                    shadow: false,
                    delay: 1000,
                    type: 'info',
                    icon: 'glyphicon glyphicon-edit'



                });

            }
        }


    });

    socket.on('session owner',function(){
        window.location.reload();
    });
});

var addNote = function () {
    var textarea = $('input[name="topic"]');
    var text = textarea.val();
    if (text.length > 0) {
        var creator=$('#userID').val();
        var editable='Yes';
        var left = 10 + Math.round(Math.random() * ($('#desk').width() - 150));
        var top = $('body>header').height() + 10 + Math.round(Math.random() * ($('#desk').height() - $(contribution).height() - 50));
        var date = new Date();
        var dateString = formatDate(date);
        var uuid = Math.uuid();
        var contribution = addContribution(uuid, dateString, text, left, top,editable);
        textarea.val("");
        $.post('/notes/new', {uuid:uuid, creation:date.getTime(),creator:creator,editable:editable, text:text, left:left, top:top, sessionId:sessionStorage.sessionId}, function (id) {
            contribution.attr('_id', id);
            contribution.attr('editable',editable);
            contribution.attr('creator',creator);
        });
        updateSelection(contribution);
    }
};

var removeSelectedNote = function () {

        var contribution = $('.selected');
        if (contribution.length !== 0) {
            var _id = $(contribution).attr('_id');
            $(contribution).fadeOut(200, function () {
                $(contribution).remove();
            });
            $.post('/notes/delete/' + _id);
        }

};

var resetSearch = function () {
    $('input[type="search"]').val('');
    var contributions = $('.contribution');
    contributions.removeClass('matching');
    contributions.removeClass('notmatching');
};

var getNoteColored=function(contribution, color){

    if(contribution){
        $(contribution).css({backgroundColor:"'"+color+"'"});
    }

};

var colorNote = function (contribution, color) {
    if (contribution) {
        if (color === 'red') {
            $(contribution).removeClass('yellow');
            $(contribution).removeClass('blue');
            $(contribution).addClass('red');
        } else if (color === 'blue') {
            $(contribution).removeClass('red');
            $(contribution).removeClass('yellow');
            $(contribution).addClass('blue');
        } else if (color === 'yellow') {
            $(contribution).removeClass('red');
            $(contribution).removeClass('blue');
            $(contribution).addClass('yellow');
        } else {
            $(contribution).removeClass('red');
            $(contribution).removeClass('blue');
            $(contribution).removeClass('yellow');
        }
    }
};

/**
 * Limits the coordinates of the contribution to fit on the desk.
 *
 * @param contribution
 * @param deskWidth
 */
var limitCoordinates = function (contribution, deskWidth, deskHeight) {
//    var maxLeft = (deskWidth || $('#desk').width()) - 150;
//    var maxTop = (deskHeight || $('#desk').height()) - $(contribution).height() + $('body>header').height() - 5;
//    $(contribution).css('left', Math.min(maxLeft, parseInt($(contribution).css('left'))));
//    $(contribution).css('top', Math.min(maxTop, parseInt($(contribution).css('top'))));
};

/**
 * Returns a formatted date String.
 *
 * @param date the date to be formatted, now if date is null
 */
var formatDate = function (date) {
    var date = date ? new Date(date) : new Date();
    return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
};

var updateSelection = function (contribution) {
    $('input[type="search"]').blur();
    $('input[name="topic"]').blur();
    var selected = $('.selected');


    if (selected.length > 0 && selected[0] !== contribution) {
        selected.removeClass('selected');
        selected.removeClass('locked');
        $(contribution).addClass('selected');

    } else {
        $(contribution).toggleClass('selected');

    }

    if($(contribution).attr('editable')=='No'){
        $(contribution).removeClass('selected');
        $(contribution).addClass('locked');
        $(contribution).addClass('selected');
    }else{
        $(contribution).addClass('selected');
        $(contribution).removeClass('locked');

    }


    console.log('updating selection');
};

/**
 * Adds a contribution to the DOM.
 *
 * @param date
 * @param text
 * @param left
 * @param top
 *
 * @return returns a contribution element
 */
var addContribution = function (uuid, date, text, left, top, color, editable) {
    var contrib = ich.contribution({uuid:uuid, creation:date, text:text,editable:editable});

    // workaround for preserving <br>
    $(contrib).find('section').html(text);
    if (left) {
        contrib.css('left', left);
    }
    if (top) {
        contrib.css('top', top);
    }





    contrib.on('click', function onClickContribution(event) {



            if ($(this).hasClass('noclick')) {
                $(this).removeClass('noclick');
            } else {


                event.stopPropagation();

                updateSelection(this)

            }

    });
    var section = contrib.find('section');
    getNoteColored(section, color);
    $(section).editable({



        editBy:'dblclick',
        editClass:'editable',
        type:'textarea',
        onEdit:function () {


            var textarea = $(this).find('.editable')[0];
            textarea.focus();
            console.log(textarea);
            var oldText = $(textarea).val();
            $(textarea).caret({start:oldText.length, end:oldText.length});
            $(textarea).on('keyup', function () {
                var newText = $(textarea).val();
                if (oldText !== newText) {
                    oldText = newText;
                    var uuid = $(contrib).attr('uuid');
                    socket.emit('update note', {uuid:uuid, text:newText});
                }
            });
        },
        onSubmit:function (event) {
            if (event.current !== event.previous) {
                var newText = event.current;
                var _id = $(contrib).attr('_id');
                $.post('/notes/update/' + _id, {uuid:$(contrib).attr('uuid'), text:newText});
            }
        }
    });
    contrib.css('position', 'absolute');

    contrib.hide().appendTo('div#desk').fadeIn(500);

    $(contrib).draggable(
        {
            containment:'#desk',
            stack:'.contribution',
            scroll: true,
            start:function () {
                if (!$(this).hasClass('selected')) {
                    updateSelection(this)
                }
                $(this).addClass('noclick');
            },
            drag:function (event, ui) {
                var left = ui.position.left;
                var top = ui.position.top;
                var uuid = $(this).attr('uuid');
                socket.emit('update note', {uuid:uuid, left:left, top:top});
            },
            stop:function (event, ui) {
                var left = ui.position.left;
                var top = ui.position.top;
                var _id = $(this).attr('_id');
                $.post('/notes/update/' + _id, {left:left, top:top});
            }
        }
    );
    contrib.css('z-index', $('.contribution').size() + 1);

    return contrib;
};