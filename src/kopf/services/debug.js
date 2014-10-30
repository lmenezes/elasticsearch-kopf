kopf.factory('DebugService', function() {

  this.enabled = false;

  this.toggleEnabled = function() {
    this.enabled = !this.enabled;
  };

  this.isEnabled = function() {
    return this.enabled;
  };

  this.debug = function(message) {
    console.log(message);
  };

  return this;

});
