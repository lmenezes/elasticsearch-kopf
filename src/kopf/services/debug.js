kopf.factory('DebugService', function() {

  var MaxMessages = 1000;

  this.messages = [];

  this.debug = function(message) {
    this.messages.push(message);
    if (this.messages.length > MaxMessages) {
      this.messages.shift();
    }
  };

  return this;

});
