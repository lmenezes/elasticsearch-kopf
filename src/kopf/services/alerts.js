var Alert=function(message, response, level, _class, icon) {
	var current_date = new Date();
	this.message = message;
	this.response = response;
	this.level = level;
	this.class = _class;
	this.icon = icon;
	this.timestamp = getTimeString(current_date);
	this.id = "alert_box_" + current_date.getTime();
	
	this.hasResponse=function() {
		return this.response != null;
	}
	
	this.getResponse=function() {
		if (this.response != null) {
			return JSON.stringify(this.response, undefined, 2);			
		}
	}
}

kopf.factory('AlertService', function() {
	this.max_alerts = 3;

	this.alerts = [];
	
	// removes ALL alerts
	this.clear=function() {
		this.alerts.length = 0;
	}
	
	// remove a particular alert message
	this.remove=function(id) {
		$("#" + id).fadeTo(1000, 0).slideUp(200, function(){
        	$(this).remove(); 
		});
		this.alerts = this.alerts.filter(function(a) { return id != a.id });
	}
	
	// creates an error alert
	this.error=function(message, response) {
		this.addAlert(new Alert(message, response, "error", "alert-danger", "icon-warning-sign"), 15000);
	}
	
	// creates an info alert
	this.info=function(message, response) {
		this.addAlert(new Alert(message, response, "info", "alert-info", "icon-info"), 5000);
	}
	
	// creates success alert
	this.success=function(message, response) {
		this.addAlert(new Alert(message, response, "success", "alert-success", "icon-ok"), 5000);
	}
	
	this.addAlert=function(alert, timeout) {
		this.alerts.unshift(alert);
		var service = this;
		setTimeout(function() { service.remove(alert.id) }, timeout);		
		if (this.alerts.length >= this.max_alerts) {
			this.alerts.length = 3;
		}
	}
	
	return this;
});