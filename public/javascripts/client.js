jQuery(document).ready(function($) {

  var $page = $('#page-index'),
      $roster = $page.find('.chatroom ul.roster'),
      $convo = $page.find('.chatroom ol.conversation'),
      $compose = $page.find('.chatroom form.compose'),
      $input = $compose.find('input'),
      $twitstream = $page.find('.twitstream ol.tweets');

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
        var val = $input.val();
        if(val.length) {
          $input.val('');
          if(val.charAt(0)=='/') {
            socket.send(JSON.stringify({'slash':val.slice(1).split(' ')}));
          }
          else {
            socket.send(JSON.stringify({'compo':val}));
          }
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
      .addClass('loaded')
      .find('.draggable')
        .each(function() {
          var $this = $(this);
          $this.jqDrag($this.find('.titlebar')).jqResize($this.find('.resize'));
        })
        .animate({height: $(window).height() - 99}, function() {
          $input.focus();
        });
  });

  socket.on('message', function(str){
    var mySessionId = this.transport.sessionid;

    function appendSpeech(speech) {
      var user = speech.user,
          $last = $convo.find('li:last'),
          when = niceTime(speech.time);
      if($last.size() && $last.find('.meta .who').attr('data-userId') == user.id) {
        $last.append($('<p/>').text(speech.text));
        $last.find('.meta .who').text(user.name);
        $last.find('.meta .when').text(when);
      }
      else {
        $('<li/>')
          .addClass(user.id==mySessionId?'isyou':'')
          .append(
            $('<div/>')
              .addClass('meta')
              .append( 
                $('<span/>')
                  .addClass('who')
                  .attr('data-userId',user.id)
                  .text(user.name)
              )
              .append( 
                $('<span/>')
                  .addClass('when')
                  .text(when)
              )
          )
          .append(
            $('<p/>')
              .text(speech.text)
          )
          .appendTo($convo);
      }
      $convo.scrollTop($convo[0]['scrollHeight']);
    }

    function preprendTweet(tweet) {
      console.info(tweet);
      var userUrl = 'http://twitter.com/'+tweet.user.screen_name;
      $('<li/>')
        .append(
          $('<div/>')
            .addClass('meta')
            .append( 
              $('<a target="_blank"/>')
                .addClass('who')
                .attr('href',userUrl)
                .append(
                  $('<img />')
                    .attr('src', tweet.user.profile_image_url)
                )
                .append(
                  $('<span />')
                    .text(tweet.user.name)
                )
            )
            .append( 
              $('<a target="_blank"/>')
                .addClass('when')
                .attr('href',userUrl+'/status/'+tweet.id_str)
                .text(niceTime(tweet.created_at))
            )
        )
        .append( 
          $('<p/>')
            .text(tweet.text) 
        )
        .hide()
        .prependTo($twitstream)
        .fadeIn();
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
              .append( $('<p/>').addClass('name').append( $( isYou ? '<a href="#rename" title="click to rename"/>' : '<span/>').text(this.name) ) )
              .append( $('<p/>').addClass('meta').text(this.id) )
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

        case 'tweets':
          $.each(obj,function() {
            preprendTweet(this);
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



  function niceTime(input) {
    var d = new Date();
    d.setTime( input.toString().indexOf(' ')!=-1 ? Date.parse(input) : parseInt(input,10) );
    return d.toTimeString();
  }
  function linkifyUrls(input){
    return input.toString().replace( /https?:\/\/[^\s]+/g, function(a) { return '<a href="'+a+'">'+a+'</a>'; } );
  }


});