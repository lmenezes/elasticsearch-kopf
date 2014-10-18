kopf.factory('SettingsService', function() {

  this.refreshInterval = 3000;

  this.autoAdjustLayout = 'true'; // enabled by default

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

  this.setAutoAdjustLayout = function(enabled) {
    this.autoAdjustLayout = '' + enabled;
    localStorage.kopfAutoAdjustLayout = this.autoAdjustLayout;
  };

  this.getAutoAdjustLayout = function() {
    if (isDefined(localStorage.kopfAutoAdjustLayout)) {
      return localStorage.kopfAutoAdjustLayout === 'true';
    } else {
      return this.autoAdjustLayout === 'true';
    }
  };

  return this;
});
