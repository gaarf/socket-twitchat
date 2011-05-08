jQuery(document).ready(function($) {

  var $page = $('#page-index'),
      $roster = $page.find('.chatroom ul.roster'),
      $convo = $page.find('.chatroom ol.conversation'),
      $compose = $page.find('.chatroom form.compose'),
      $input = $compose.find('input'),
      $twitstream = $page.find('.twitstream ol.tweets');

  var socket = new io.Socket();
  socket.connect();

  $convo.delegate('.disconnect a', 'click', function(e) {
    e.preventDefault();
    window.location.reload();
  });

  $roster.delegate('a', 'click', function(e) {
    e.preventDefault();
    socket.send(JSON.stringify({'slash':['help','nick']}));
    $input.val("/nick ").focus();
  });

  socket.on('connect', function(){
    console.info('socket connected');

    socket.send(JSON.stringify({'hello': {
      ua: navigator.userAgent,
      name: name
    }}));

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

    $.each(JSON.parse(str), function(k,obj) {
      // console.log(k,obj)

      switch(k) {

        case 'roster':
          $roster.empty();
          $.each(obj, function() {
            var isYou = (mySessionId == this.id);
            $('<li/>')
              .addClass( isYou ? 'isyou' : '')
              .append( $('<p/>').addClass('name').append( $( isYou ? '<a href="#rename" />' : '<span/>').text(this.name) ) )
              .append( $('<p/>').addClass('meta').text(this.id) )
              .appendTo($roster);
          });
        break;

        case 'join':
          if(mySessionId != obj.id) {
            appendSystem('<strong>'+obj.name+'</strong> has joined.', 'join');
          }
          else {
            appendSystem('You are now named <strong>'+obj.name+'</strong>.');
          }
        break;

        case 'gone':
          if(mySessionId != obj.id) {
            appendSystem('<strong>'+obj.name+'</strong> is gone.', 'gone');
          }
        break;

        case 'topic':
          $twitstream.empty();
          setTitle(obj.what);
          if(obj.who) {
            appendSystem( 'The topic was '+(obj.what?'changed':'cleared')+' by <strong>'+obj.who.name+'</strong>.', 'topic' );
          }
        break;

        case 'system':
          appendSystem(obj.msg, obj.addCls);
        break;

        case 'speech':
          appendSpeech(obj, mySessionId);
        break;

        case 'buffer':
          $convo.empty();
          $.each(obj,function() {
            appendSpeech(this, mySessionId);
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
    appendSystem('<strong>Socket disconnected.</strong> <a href="#reload">reload</a>', 'disconnect');
  });

  function setTitle(str) {
    if(str) {
      $('title,header').text( str );
    }
    else {
      $('title').text('socket-streamies');
      $('header').html('use <kbd>/topic</kbd>!');
    }
  }

  function appendSystem(msg, addCls) {
    $('<li/>')
      .addClass('system '+(addCls||''))
      .append( $('<p/>').html(msg) )
      .appendTo($convo);
    scrollConvo();
  }

  function appendSpeech(speech, mySessionId) {
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
    scrollConvo();
  }

  function scrollConvo() {
    $convo.scrollTop($convo[0]['scrollHeight']);
  }

  function preprendTweet(tweet) {
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

  function niceTime(input) {
    var d = new Date();
    d.setTime( input.toString().indexOf(' ')!=-1 ? Date.parse(input) : parseInt(input,10) );
    return d.toLocaleTimeString();
  }

  // function linkifyUrls(input){
  //   return input.toString().replace( /https?:\/\/[^\s]+/g, function(a) { return '<a href="'+a+'">'+a+'</a>'; } );
  // }


});