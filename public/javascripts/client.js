jQuery(document).ready(function($) {

  var $page = $('#page-index').addClass('loading'),
      $roster = $page.find('.chatroom ul.roster'),
      $convo = $page.find('.chatroom ol.conversation'),
      $compose = $page.find('.chatroom form.compose');

  var socket = new io.Socket();
  socket.connect();

  socket.on('connect', function(){
    console.info('socket connected');

    this.send(JSON.stringify({'hello': {
      ua: navigator.userAgent,
      name: null // TODO: cookie to store name
    }}));

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

      var spkid = speech.user.id,
          $last = $convo.find('li:last'),
          when = (new Date(speech.time)).toTimeString();

      if($last.size() && $last.find('.meta .who').attr('data-userid') == spkid) {
        $last.append($('<p/>').text(speech.text));
        $last.find('.meta .when').text(when);
      }
      else {
        $('<li/>')
          .addClass(spkid==mySessionId?'isyou':'')
          .append(
            $('<div/>').addClass('meta')
              .append($('<span/>').addClass('who').attr('data-userid',spkid).text(speech.user.name))
              .append($('<span/>').addClass('when').text(when))
          )
          .append($('<p/>').text(speech.text))
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
            var $n = $('<li/>').attr('data-id', this.id)
              .append($('<p/>').addClass('name').text(this.name))
              .append($('<p/>').addClass('ip').text(this.ip))

            if(mySessionId == this.id) {
              $n.addClass('isyou');
            }

            $n.appendTo($roster);
          });
        break;

        case 'speech':
          appendSpeech(obj);
        break;

        case 'buffer':
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