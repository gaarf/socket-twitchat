jQuery(document).ready(function($) {

  $('#page-index .draggable').each(function() {
    var $this = $(this);
    $this.jqDrag($this.find('.titlebar')).jqResize($this.find('.resize'));
  }).animate({height: $(window).height() - 99});



  var socket = new io.Socket();
  socket.connect();

  socket.on('connect', function(){
    console.log('socket connect');
  });

  socket.on('message', function(){
    console.log('socket message', arguments);
  });

  socket.on('disconnect', function(){
    console.log('socket disconnect');
  });

});