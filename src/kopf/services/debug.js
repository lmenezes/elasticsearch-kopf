kopf.factory('DebugService', function() {

  var MaxMessages = 1000;

  var messages = [];

  var updatedAt = 0;

  this.debug = function(message) {
    messages.push(message);
    if (messages.length > MaxMessages) {
      messages.shift();
    }
    updatedAt = new Date().getTime();
  };

  this.getUpdatedAt = function() {
    return updatedAt;
  };

  this.getMessages = function() {
    return messages;
  };

  return this;

});
