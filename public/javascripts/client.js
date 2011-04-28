jQuery(document).ready(function($) {

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