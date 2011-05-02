jQuery(document).ready(function($) {

  var $page = $('#page-index').addClass('loading'),
      $roster = $page.find('.chatroom ul.roster'),
      $convo = $page.find('.chatroom ol.conversation'),
      $compose = $page.find('.chatroom form.compose');

  var socket = new io.Socket();
  socket.connect();

  socket.on('connect', function(){
    console.info('socket connected');

    function setName(name) {
      socket.send(JSON.stringify({'hello': {
        ua: navigator.userAgent,
        name: name
      }}));
    }

    setName();

    $compose
      .bind('submit', function(e) {
        e.preventDefault();
        var $input = $(this).find('input'),
            val = $input.val();
        if(val) {
          $input.val('');
          socket.send(JSON.stringify({'compo':val}));
        }
      });

    $roster
      .delegate('a', 'click', function(e) {
        e.preventDefault();
        var name = prompt('Change your name:');
        if(name.length) {
          setName(name);
        }
      });

    $page
      .removeClass('loading')
      .find('.draggable')
        .each(function() {
          var $this = $(this);
          $this.jqDrag($this.find('.titlebar')).jqResize($this.find('.resize'));
        })
        .animate({height: $(window).height() - 99});
  });

  socket.on('message', function(str){
    var mySessionId = this.transport.sessionid;

    function appendSpeech(speech) {
      var user = speech.user,
          $last = $convo.find('li:last'),
          when = (new Date(speech.time)).toTimeString();
      if($last.size() && $last.find('.meta .who').attr('data-userid') == user.id) {
        $last.append($('<p/>').text(speech.text));
        $last.find('.meta .who').text(user.name);
        $last.find('.meta .when').text(when);
      }
      else {
        $('<li/>')
          .addClass(user.id==mySessionId?'isyou':'')
          .append(
            $('<div/>').addClass('meta')
              .append( $('<span/>').addClass('who').attr('data-userid',user.id).text(user.name) )
              .append( $('<span/>').addClass('when').text(when) )
          )
          .append( $('<p/>').text(speech.text) )
          .appendTo($convo);
      }
      $convo.scrollTop($convo[0]['scrollHeight']);
    }

    $.each(JSON.parse(str), function(k,obj) {
      console.log('received '+k, obj);

      switch(k) {

        case 'roster':
          $roster.empty();
          $.each(obj, function() {
            var isYou = (mySessionId == this.id);
            $('<li/>')
              .addClass( isYou ? 'isyou' : '')
              .attr('data-id', this.id)
              .append( $('<p/>').addClass('name').append( $( isYou ? '<a href="#" title="click to rename"/>' : '<span/>').text(this.name) ) )
              .append( $('<p/>').addClass('ip').text(this.ip) )
              .appendTo($roster);
          });
        break;

        case 'speech':
          appendSpeech(obj);
        break;

        case 'buffer':
          $convo.empty();
          $.each(obj,function() {
            appendSpeech(this);
          });
        break;

      }
    });
  });

  socket.on('disconnect', function(){
    $roster.empty();
    $compose.children().attr('disabled', true);
    alert('socket disconnected');
  });

});