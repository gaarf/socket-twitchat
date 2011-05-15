var _ = require('underscore');

module.exports.slash = slashCommand;
/* ================================================================ slashCommand */

function slashCommand(user, o) {
  if(!_.isArray(o)) {
    return;
  }
  o = _.compact(o);

  var isHelp,
      responseMsg,
      responseCls,
      room = user._room,
      command = cleanToken(o.shift());

  if(command=='help') {
    isHelp = true;
    command = cleanToken(o.shift());
  }

  switch(command) {
    case 'nick':
      var newname = o.shift();
      if(!newname || isHelp) {
        responseMsg = '<kbd>/nick [newname]</kbd><br/>';
        responseMsg += 'Change your name.';
      }
      else {
        user.setName(newname);
      }
    break;

    case 'topic':
      var sub = o.shift();
      if(!sub || isHelp) {
        responseMsg = '<kbd>/topic set|add [newtopic]</kbd><br/>';
        responseMsg += 'Change the room topic, clearing the twitter stream and starting anew.<br/>';
        responseMsg += '<kbd>/topic sample</kbd><br/>';
        responseMsg += 'Use the sample stream.';
      }
      else if(room) {
        var newtopic = o.join(' ');
        switch(sub) {
          case 'add':
            var c = room.topicCount();
            if(c){
              if(c>=3) {
                responseCls = 'oops';
                responseMsg = 'Sorry, I don\'t think should add more topics.';
              }
              else {
                room.addTopic(newtopic, user);
              }
              break;
            }
          case 'set':
            room.setTopic(newtopic, user);
          break;
          case 'sample':
            room.setTopic('', user);
          break;
          default:
            return slashCommand(user, ['help','topic']);
          break;
        }
        
      }
    break;

    case 'stop':
      if(isHelp) {
        responseMsg = '<kbd>/stop</kbd><br/>';
        responseMsg += 'Stop the twitter stream.';
      }
      else {
        if(room && room.stream) {
          room.killStream(user);
        }
        else {
          responseCls = 'oops';
          responseMsg = 'Stream does not exist, or is already stopped.';
        }
      }
    break;

    case 'img':
      var url = o.shift();
      if(isHelp || !url) {
        responseMsg = '<kbd>/img [url]</kbd><br/>';
        responseMsg += 'Post an image to the chatroom.';
      }
      else {
        if(!user.sayImage(url, o.join(' '))) {
          responseCls = 'oops';
          responseMsg = 'Is that really a valid url?';
        }
      }
    break;

    case 'clear':
      if(isHelp) {
        responseMsg = '<kbd>/clear</kbd><br/>';
        responseMsg += 'Empty your conversation and stream areas.';
      }
    break;

    default:
      if(isHelp && command) {
        responseCls = 'oops';
        responseMsg = 'There is no <kbd>'+command+'</kbd> command.';
      }
      else {
        responseMsg = 'This is a Twitter-enabled chatroom. ';
        if(room && room.stream && room.topic) {
          responseMsg += 'The current topic is <em>'+room.topic+'</em>. ';
        }
        responseMsg += 'All participants see the same stream of live twitter activity matching the current topic.';
        responseMsg += '<br/><br/>';
        responseMsg += 'Commands you can try: <kbd>/topic, /stop, /nick, /img, /clear</kbd>.<br/>';
        responseMsg += 'Get help on a specific command with <kbd>/help [command]</kbd>.';
      }
    break;

  }

  if(responseCls=='notimplemented') {
    responseMsg = '<kbd>/'+command+'</kbd> command is not yet implemented :-(';
  }
  if(responseMsg) {
    return {
      msg: responseMsg,
      cls: responseCls||'help'
    }
  }
}


/* ================================================================ utilities */

function cleanToken(str) {
  return str ? str.replace(/\W/g,'') : '';
}

