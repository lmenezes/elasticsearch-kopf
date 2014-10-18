kopf.factory('HostHistoryService', function() {

  this.getHostHistory = function() {
    var history = localStorage.getItem('kopfHostHistory');
    history = isDefined(history) ? history : '[]';
    return JSON.parse(history);
  };

  this.addToHistory = function(host) {
    host = host.toLowerCase();
    var hostEntry = {host: host};
    var history = this.getHostHistory();
    for (var i = 0; i < history.length; i++) {
      if (history[i].host === host) {
        history.splice(i, 1);
        break;
      }
    }
    history.splice(0, 0, hostEntry);
    if (history.length > 10) {
      history.length = 10;
    }
    localStorage.setItem('kopfHostHistory', JSON.stringify(history));
  };

  this.clearHistory = function() {
    localStorage.removeItem('kopfHostHistory');
  };

  return this;

});
