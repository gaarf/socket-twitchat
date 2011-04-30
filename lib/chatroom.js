module.exports.createChatRoom = function(topic) {
    var r = new ChatRoom();
    r.topic = topic;
    rooms.push(r);
    return r;
};

var rooms = [];

var ChatRoom = function() {
    return {
      getTopic: function() {
        return 'thisTopic=' + this.topic;
      }
    }
};

