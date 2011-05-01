jQuery(document).ready(function($) {

  $('#page-index .draggable').each(function() {
    var $this = $(this);
    $this.jqDrag($this.find('.titlebar')).jqResize($this.find('.resize'));
  }).animate({height: $(window).height() - 99});


  var $roster = $('#page-index .chatroom ul.roster'),
      $convo = $('#page-index .chatroom ol.conversation');

  var socket = new io.Socket();
  socket.connect();

  socket.on('message', function(str){
    var mySessionId = this.transport.sessionid;

    $.each($.parseJSON(str), function(k,obj) {
      switch(k) {

        case 'roster':
          console.log('received roster', obj);
          $roster.empty();
          $.each(obj, function() {
            var name = this.name || this.id;

            var $n = $('<li/>').attr('data-id', this.id)
              .append($('<p/>').addClass('name').text(name))
              .append($('<p/>').addClass('ip').text(this.ip))

            console.log(mySessionId, this.id);
            if(mySessionId == this.id) {
              console.log('adding you');
              $n.addClass('isyou');
            }

            $n.appendTo($roster);
          });
        break;

        case 'speech':
          console.log('received speech', obj);
        break;

        case 'buffer':
          console.log('received buffer', obj);
        break;

      }
    });
  });

  socket.on('disconnect', function(){
    console.log('socket disconnect');
  });

});