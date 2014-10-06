kopf.factory('HostHistoryService', function() {

    this.getHostHistory=function() {
        var history = localStorage.getItem('kopf_host_history');
        history = isDefined(history) ? history : "[]";
        return JSON.parse(history);
    };

    this.addToHistory=function(host) {
        host = host.toLowerCase();
        var host_entry = { host: host };
        var history = this.getHostHistory();
        for (var i = 0; i < history.length; i++) {
            if (history[i].host === host) {
                history.splice(i, 1);
                break;
            }
        }
        history.splice(0,0,host_entry);
        if (history.length > 10) {
            history.length = 10;
        }
        localStorage.setItem('kopf_host_history', JSON.stringify(history));
    };

    this.clearHistory=function() {
        localStorage.removeItem('kopf_host_history');
    };

    return this;

});