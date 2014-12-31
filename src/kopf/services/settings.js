kopf.factory('SettingsService', function() {

  this.refreshInterval = 3000;

  this.setRefreshInterval = function(interval) {
    this.refreshInterval = interval;
    localStorage.kopfRefreshInterval = interval;
  };

  this.getRefreshInterval = function() {
    if (isDefined(localStorage.kopfRefreshInterval)) {
      return localStorage.kopfRefreshInterval;
    } else {
      return this.refreshInterval;
    }
  };

  return this;

});
