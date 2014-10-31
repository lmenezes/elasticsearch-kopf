kopf.factory('DebugService', ['$location', function($location) {

  this.enabled = $location.search().debug === 'true';

  this.toggleEnabled = function() {
    this.enabled = !this.enabled;
  };

  this.isEnabled = function() {
    return this.enabled;
  };

  this.debug = function(message) {
    if (this.isEnabled()) {
      console.log(message);
    }
  };

  return this;

}]);
