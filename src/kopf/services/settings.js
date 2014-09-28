kopf.factory('SettingsService', function() {
	
	this.refresh_interval = 3000;

    this.auto_adjust_layout = "true"; // enabled by default

	this.setRefreshInterval=function(interval) {
		this.refresh_interval = interval;
		localStorage.kopf_refresh_interval = interval;
	};
	
	this.getRefreshInterval=function() {
		if (isDefined(localStorage.kopf_refresh_interval)) {
			return localStorage.kopf_refresh_interval;
		} else {
			return this.refresh_interval;
		}
	};

    this.setAutoAdjustLayout=function(enabled) {
        this.auto_adjust_layout = "" + enabled;
        localStorage.kopf_auto_adjust_layout = this.auto_adjust_layout;
    };

    this.getAutoAdjustLayout=function() {
        if (isDefined(localStorage.kopf_auto_adjust_layout)) {
            return localStorage.kopf_auto_adjust_layout === "true";
        } else {
            return this.auto_adjust_layout === "true";
        }
    };

	return this;
});