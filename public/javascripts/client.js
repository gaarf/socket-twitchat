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

    var strLastSubmit = '';

    $input
      .bind('keyup', function(e) {
        switch(e.keyCode) {
          case 38: // up arrow
            if(strLastSubmit) {
              $input.val(strLastSubmit);
            }
          break;
          case 27: // escape
            $input.val('');
          break;
        }
      });

    $compose
      .bind('submit', function(e) {
        e.preventDefault();
        var val = $input.val();
        if(val.length) {
          strLastSubmit = val;
          $input.val('');
          if(val.charAt(0)=='/') {
            var o = val.slice(1).split(' ');
            switch(o[0]) {
              case 'clear':
                $convo.empty();
                $twitstream.empty();
              break;

              default:
                socket.send(JSON.stringify({'slash':o}));
              break;
            }
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
          setTitle(obj.what);
          if(obj.who) {
            $twitstream.empty();
            if(obj.what) {
              appendSystem( 'The topic was changed to <em>'+obj.what+'</em> by <strong>'+obj.who.name+'</strong>.', 'topic' );
            }
            else {
              appendSystem( 'The topic was cleared by <strong>'+obj.who.name+'</strong>.', 'topic' );
            }
          }
        break;

        case 'stop':
          if(obj.who) {
            appendSystem( 'The stream was stopped by <strong>'+obj.who.name+'</strong>.', 'stop' );
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
          var single = (obj.length==1);
          $.each(obj,function(i, o) {
            preprendTweet(o,single);
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
    $('title').text('TwitChat'+(str?' / '+str:''));
    $('header')[str?'text':'html'](str||'use <kbd>/topic</kbd>!');
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

  function preprendTweet(tweet, slide) {
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
      [slide?'slideDown':'fadeIn']('fast', function() {
        $(this).addClass('shown');
      });
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