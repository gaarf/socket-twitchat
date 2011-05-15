jQuery(document).ready(function($) {

  var $page = $('#page-index'),
      $roster = $page.find('.chatroom ul.roster'),
      $convo = $page.find('.chatroom ol.conversation'),
      $compose = $page.find('.chatroom form.compose'),
      $input = $compose.find('input'),
      $twitstream = $page.find('.twitstream ol.tweets');

  var socket = new io.Socket();
  socket.connect();

  soundManager.url = '/javascripts/libs/soundmanager2/';
  soundManager.onload = function() {
    $.each(['fingerplop', 'fingerplop2'], function(i, name) {
      soundManager.createSound(name,'/mp3/'+name+'.mp3');
    });
  };

  $convo.add($twitstream).delegate('a', 'click', function(e) {
    e.preventDefault();
    var $link = $(this);
    if($link.is('.disconnect a')) {
      window.location.reload();
    }
    else { // emulate target='_blank
      window.open($link.attr('href'));
    }
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
    var mySessionId = this.transport.sessionid,
        doAlert = false;

    // console.debug('>>>',str);

    $.each(JSON.parse(str), function(k,obj) {

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
            doAlert = k;
          }
          else {
            appendSystem('You are now named <strong>'+obj.name+'</strong>.');
          }
        break;

        case 'gone':
          if(mySessionId != obj.id) {
            appendSystem('<strong>'+obj.name+'</strong> is gone.', 'gone');
            doAlert = k;
          }
        break;

        case 'topic':
          setTitleAndHeader(obj.what);
          if(obj.who) {
            $twitstream.empty();
            if(obj.what) {
              appendSystem( 'The topic was changed to <em>'+obj.what+'</em> by <strong>'+obj.who.name+'</strong>.', 'topic' );
            }
            else {
              appendSystem( 'The topic was cleared by <strong>'+obj.who.name+'</strong>.', 'topic' );
            }
            doAlert = k;
          }
        break;

        case 'stop':
          if(obj.who) {
            appendSystem( 'The stream was stopped by <strong>'+obj.who.name+'</strong>.', 'stop' );
            doAlert = k;
          }
        break;

        case 'system':
          appendSystem(obj.msg, obj.addCls);
        break;

        case 'speech':
          appendSpeech(obj, mySessionId);
          doAlert = k;
          soundManager.play(mySessionId!=obj.user.id ? 'fingerplop' : 'fingerplop2');
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

    if(doAlert) {
      if($('body').is('.blurred')) {
        blinkTitle("["+doAlert+"]")
      }
    }

  });



  socket.on('disconnect', function(){
    $roster.add($compose).empty();
    appendSystem('<strong>Socket disconnected.</strong> <a href="#reload">reload</a>', 'disconnect');
  });


  $(window).bind({
    focus: function() { 
      $('body').removeClass('blurred'); 
      blinkTitle(false);
    },
    blur: function() { $('body').addClass('blurred'); }
  });

  var BLINK_TITLE_INTERVAL;

  function blinkTitle(blinkTxt) {
    clearInterval(BLINK_TITLE_INTERVAL);

    var $title = $('title'),
        originalTxt = $title.data('originalTxt') || $title.text();

    $title
      .data('originalTxt', originalTxt)
      .text(originalTxt)
      .removeClass('blink');

    if(blinkTxt) {
      BLINK_TITLE_INTERVAL = setInterval(function() {
        if($title.is('.blink')) { $title.removeClass('blink').text($title.data('originalTxt')); }
        else { $title.addClass('blink').text(blinkTxt); }
      }, 1000);
    }
  }

  function setTitleAndHeader(str) {
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

  function spokenElement(s) {
    if(s.image && 0===$convo.find('div.image img[src="'+s.image+'"]').size()) { // dont repost images
      return $('<div class="image" />').append(
        $('<a />').attr('href', s.image).append(
          $('<img/>').attr('src', s.image).attr('title', s.text==s.image ? '' : s.text)
        )
      ); 
    }
    return $('<p/>').html( twttr.txt.autoLink(s.text) );
  }

  function appendSpeech(speech, mySessionId) {
    var user = speech.user,
        $last = $convo.find('li:last'),
        when = niceTime(speech.time);

    if($last.size() && $last.find('.meta .who').attr('data-userId') == user.id) {
      $last.append(spokenElement(speech));
      $last.find('.meta .who').text(user.name);
      $last.find('.meta .when').text(when);
    }
    else {
      $('<li/>')
        .addClass(user.id==mySessionId?'isyou':'')
        .append(
          $('<div class="meta" />')
            .append( $('<span class="who" />').attr('data-userId',user.id).text(user.name) )
            .append( $('<span class="when" />').text(when) )
        )
        .append(spokenElement(speech))
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
            $('<a class="who" />')
              .attr('href',userUrl)
              .append( $('<img />').attr('src', tweet.user.profile_image_url) )
              .append( $('<span />').text(tweet.user.name) )
          )
          .append( 
            $('<a class="when" />')
              .attr('href',userUrl+'/status/'+tweet.id_str)
              .text(niceTime(tweet.created_at))
          )
      )
      .append( $('<p/>').html(twttr.txt.autoLink(tweet.text)) )
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

});