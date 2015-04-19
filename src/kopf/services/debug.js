kopf.factory('DebugService', function() {

  var MaxMessages = 1000;

  var messages = [];

  var updatedAt = 0;

  var addMessage = function(message) {
    messages.push(message);
    if (messages.length > MaxMessages) {
      messages.shift();
    }
    updatedAt = new Date().getTime();
  };

  this.debug = function(message, data) {
    addMessage(message);
    if (data) {
      addMessage(JSON.stringify(data));
    }
  };

  this.getUpdatedAt = function() {
    return updatedAt;
  };

  this.getMessages = function() {
    return messages;
  };

  return this;

});
