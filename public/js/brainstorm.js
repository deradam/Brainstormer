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
        if (e.originalEvent.detail === 1) {
            clickTimer = setTimeout(function() {

                updateSelection();
            }, 250);
        }
    });
    $(window).keydown(function (event) {
        var source = event.target.tagName.toLowerCase();
        if (source != "input" && source != "textarea") {
            if (event.which == 8 || event.which == 46) {
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

            var contribution = $('.selected');
            if (contribution.length > 0) {
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
            }
        }
    });



    $('#inviteBtn').on('click',function(){

        var userMail=$('#userMail').val();

        var permission=$.trim($('#permissionBtn').text());

        if(userMail && permission!='Permission'){

            $.post('/user/invite',{usermail:userMail,sessionID:sessionId,permission:permission}, function(response){
                $('.alert').remove();
                if(response==-3 && !$('#inviteUserLabel').next().attr('id')){
                    $('.alert').remove();
                    $('#inviteUserLabel').after('<div id="inviteUserFailure" class="alert alert-danger alert-dismissable"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>Something went wrong: <ul> <li>already invited!</li>  </ul>  </div>');
                }

                if(response==-2 && !$('#inviteUserLabel').next().attr('id')){
                    $('.alert').remove();
                    $('#inviteUserLabel').after('<div id="inviteUserFailure" class="alert alert-danger alert-dismissable"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>Something went wrong: <ul> <li>User doesnt exist!</li>  </ul>  </div>');
                }


                if(response==1){
                    $('.alert').remove();
                    $('#inviteUserLabel').after('<div id="inviteUserSuccess" class="alert alert-success"> User invited!  </div>');

                }

            });

        }else if(!userMail && !$('#inviteUserLabel').next().attr('id')){
            $('#inviteUserLabel').after('<div id="inviteUserFailure" class="alert alert-danger"> Something went wrong: <ul> <li>Please set User E-Mail</li>  </ul>  </div>');

        }else if(permission=='Permission'){
            $('#inviteUserLabel').after('<div id="inviteUserFailure" class="alert alert-danger"> Something went wrong: <ul> <li>Please set Permission</li>  </ul>  </div>');

        }
    })

    $('#closeInviteBtn').on('click',function(){

        $('.alert').remove();

    });

    $('#abortInviteBtn').on('click',function(){

        $('.alert').remove();

    })

    $('#desk').on('click','section',function(){

    });



    $.get('/notes/' + sessionStorage.sessionId, function (notes) {
        $.each(notes, function (index, note) {
            var date = new Date(note.creation);
            // fallback for old notes without uuid
            note.uuid = note.uuid || Math.uuid();
            var contribution = addContribution(note.uuid, formatDate(date), note.text, note.left, note.top, note.color);
            limitCoordinates(contribution, null, null);
            contribution.attr('_id', note._id);
        });
    });

    // socket.io configuration
    socket = io.connect('http://' + window.location.hostname + (window.location.port === '' ? '' : ':' + window.location.port));
    
    socket.on('connect', function() {
        var data={user:$('#usermail').val(),session:sessionId};
        socket.emit('join session', data);
    });

    socket.on('session deleted',function(sessionID){
        alert("deleted");
    });

    socket.on('member accepted',function(member){

        var permissionsymbol;

        if(member.permission=='Read'){
            permissionsymbol='<span class="glyphicon glyphicon-eye-open"></span>';
        }else{
            permissionsymbol='<span class="glyphicon glyphicon-pencil"></span>';
        }

        var test= '<li > <a href=""  data-toggle="modal" data-target="#modal-container-userSettings"><span class="glyphicon glyphicon-user"></span>'+member.user+permissionsymbol+'  </a> </li>';

        $('#members').prepend('<li > <a href=""  data-toggle="modal" data-target="#modal-container-userSettings"><span class="glyphicon glyphicon-user"></span>'+member.user+' '+permissionsymbol+'  </a> </li>');


     });
    
    socket.on('note added', function(note) {
        // check if we cannot find that element already (otherwise we have added it ourselves)
        if ($('.contribution[uuid=' + note.uuid + ']').length == 0) {
            var contribution = addContribution(note.uuid, formatDate(note.creation), note.text, note.left, note.top, note.color);
            limitCoordinates(contribution, null, null);
            contribution.attr('_id', note._id);
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
});

var addNote = function () {
    var textarea = $('input[name="topic"]');
    var text = textarea.val();
    if (text.length > 0) {
        var left = 10 + Math.round(Math.random() * ($('#desk').width() - 150));
        var top = $('body>header').height() + 10 + Math.round(Math.random() * ($('#desk').height() - $(contribution).height() - 50));
        var date = new Date();
        var dateString = formatDate(date);
        var uuid = Math.uuid();
        var contribution = addContribution(uuid, dateString, text, left, top);
        textarea.val("");
        $.post('/notes/new', {uuid:uuid, creation:date.getTime(), text:text, left:left, top:top, sessionId:sessionStorage.sessionId}, function (id) {
            contribution.attr('_id', id);
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
        $(contribution).addClass('selected');
    } else {
        $(contribution).toggleClass('selected');
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
var addContribution = function (uuid, date, text, left, top, color) {
    var contrib = ich.contribution({uuid:uuid, creation:date, text:text});
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