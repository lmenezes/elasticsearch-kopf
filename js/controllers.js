function hideShow(id) {
	if ($("#" + id).hasClass("json-visible")) {
		$("#" + id).removeClass("json-visible");
		$("#" + id).addClass("json-collapsed");
		$("#" + id).prev().addClass("icon-expand-alt");
		$("#" + id).prev().removeClass("icon-collapse-alt");

	} else {
		$("#" + id).addClass("json-visible");
		$("#" + id).removeClass("json-collapsed");
		$("#" + id).prev().removeClass("icon-expand-alt");
		$("#" + id).prev().addClass("icon-collapse-alt");
		
	}
}
var collapseJsonId = 0;
function beautifulJson(data) {
	collapseJsonId = 0;
	return beautifulJsonObject(data);
}


function beautifulJsonObject(data) {
	var is_array = data instanceof Array;
	var open_container = is_array ? '[' : '{';
	var close_container = is_array ? ']' : '}';
	collapseJsonId += 1;
	var content = open_container + " <i class=\"icon-collapse-alt\" onclick=\"hideShow('collapse_json" + collapseJsonId + "')\"></i><div class=\"json-visible json-object\" id=\"collapse_json" + collapseJsonId + "\">";
	if (data instanceof Array) {
		data.forEach(function(x) { 
			if (data[data.length -1] == x) {
				content += '<div class=\"json-content\"">' + formatValue(x)+ '</div>';
			} else {
				content += '<div class=\"json-content\"">' + formatValue(x)+ ',</div>';	
			}
		});	
	} else {
		var properties = Object.keys(data);
		properties.map(function(x) { 
			if (properties[properties.length - 1] == x) { // dont add the comma
				content += '<div class=\"json-content\""><span class="json-property">"'+x+"</span> : " + formatValue(data[x])+ '</div>';
			} else {
				content += '<div class=\"json-content\""><span class="json-property">"'+x+"</span> : " + formatValue(data[x])+ ',</div>';	
			}
		});		
	}
	content += "</div> " + close_container;
	return content;
}

function formatValue(value) {
	if (typeof value === 'boolean' || typeof value === 'number') {
		return "<span class=\"json-" + (typeof value) + "\">"+value+"</span>";
	} else {
		if (typeof value === 'string') {
			return "<span class=\"json-" + (typeof value) + "\">\""+value+"\"</span>";
		}
		if (value == null) {
			return "<span class\"json-content json-null\">null</span>";
		} else {
			return beautifulJsonObject(value);
		}
	}
}




//Type	Result
//Undefined	"undefined"
//Null	"object"

//Host object (provided by the JS environment)	Implementation-dependent
//Function object (implements [[Call]] in ECMA-262 terms)	"function"
//E4X XML object	"xml"
//E4X XMLList object	"xml"
//Any other object	"object"

function CreateIndexCtrl($scope, $location, $timeout) {
	$scope.mapping = '';
	$scope.shards = '';
	$scope.replicas = '';
	$scope.name = '';
	
	$scope.createIndex=function() {
		try {
			if ($scope.name.trim().length == 0) {
				$scope.modal.alert = new Alert(false, "", "You must specify a valid index name", null);	
			} else {
			var settings;
			if ($scope.mapping.trim().length > 0) {
				settings = JSON.parse($scope.mapping, null);
			} else {
				settings = {};
			}
			
			if (typeof settings['settings'] == 'undefined') {
				settings['settings'] = {};
			} 
			if (typeof settings['settings']['index'] == 'undefined') {
				settings['settings']['index'] = {};
			} 
			var index_settings = settings['settings']['index'];
			if (typeof index_settings['number_of_shards'] === 'undefined' && $scope.shards.length > 0) {
				index_settings['number_of_shards'] = $scope.shards;
			}
			if (typeof index_settings['number_of_replicas'] === 'undefined' && $scope.replicas.length > 0) {
				index_settings['number_of_replicas'] = $scope.replicas;
			}
			var response = createIndex("http://" + $location.host() + ":" + $location.port(),$scope.name, JSON.stringify(settings, undefined, "  "));
			$scope.modal.alert = new Alert(response.success, 'Index successfully created', 'Error while creating index', response);
		}
		} catch(err) {
			$scope.modal.alert = new Alert(false, "", "Invalid JSON for settings", null);
		}
	}
}

function IndexSettingsCtrl($scope, $location, $timeout) {
	var new_index = {};
	$scope.new_index = new_index;
	
	//index.cache.filter.max_size,index.cache.filter.expire
	
	var allowed_properties = ['index.number_of_replicas', 'index.auto_expand_replicas', 
	'index.blocks.read_only', 'index.blocks.read', 'index.blocks.write<', 'index.blocks.metadata',
	 'index.refresh_interval', 'index.term_index_interval', 'index.term_index_divisor', 
	 'index.translog.flush_threshold_ops', 'index.translog.flush_threshold_size', 
	 'index.translog.flush_threshold_period', 'index.translog.disable_flush', 
	 'index.routing.allocation.total_shards_per_node', 
	 'index.recovery.initial_shards', 'index.gc_deletes', 'index.ttl.disable_purge'];

	$scope.saveSettings=function(index) {
		$scope.cluster.indices.forEach(function(x) { 
			if (x.name === index) {
				var new_settings = {};
				allowed_properties.forEach(function(setting) {
					if (typeof x.settings[setting] != 'undefined' && x.settings[setting].length > 0) {
						new_settings[setting] = x.settings[setting];
					}
				});
				var response = updateIndexSettings($scope.host, x.name, JSON.stringify(new_settings, undefined, ""));
				$scope.modal.alert = new Alert(response.success, "Index settings were successfully updated","Error while updating index settings",response.response);
			}
		});
	}
}

function ClusterSettingsCtrl($scope, $location, $timeout) {
	$scope.saveClusterSettings=function() {
		var new_settings = {};
		new_settings['transient'] = $scope.cluster.settings;
		var response = updateClusterSettings($scope.host, JSON.stringify(new_settings, undefined, ""));
		$scope.modal.alert = new Alert(response.success, "Cluster settings were successfully updated","Error while updating cluster settings",response.response);
	};
}

function NavbarController($scope, $location, $timeout) {
	
	$scope.new_refresh = $scope.getRefresh();
	
	$scope.connectToHost=function() {
		$scope.setHost($scope.new_host);
	}
	
	$scope.changeRefresh=function() {
		$scope.setRefresh($scope.new_refresh);
	}
}
function Request() {
	this.url = '';
	this.method = 'GET';
	this.body = ''
}
function RestCtrl($scope, $location, $timeout) {
	$scope.request = new Request();
	$scope.sendRequest=function() {
		var response = syncRequest($scope.request.method,$scope.request.url,$scope.request.body);
		//$scope.response = JSON.stringify(response.response, undefined, 4);
		var content = beautifulJson(response.response);
		$('#wasDaFuck').html(content);
	}
}

/* Main controller, all should inherit from this */
function GlobalController($scope, $location, $timeout) {
	$scope.host = "http://" + $location.host() + ":" + $location.port();
	$scope.refresh = 3000;
	$scope.modal = new ModalControls();
	$scope.alert = null;
	$scope.cluster = null;
	
	$scope.setHost=function(host) {
		$scope.host = host;
	}
	
	$scope.setRefresh=function(refresh) {
		$scope.refresh = refresh;
	}
	
	$scope.getRefresh=function() {
		return $scope.refresh;
	}

	$scope.openModal=function(){
		$scope.modal.active = true;
	}
	
	$scope.closeModal=function(){
		setTimeout(function() { $scope.modal.active = false; }, 300);
		$scope.modal.alert = null; // clear alerts
	}
	
	$scope.readablizeBytes=function(bytes) {
		if (bytes > 0) {
		    var s = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];
		    var e = Math.floor(Math.log(bytes) / Math.log(1024));
		    return (bytes / Math.pow(1024, e)).toFixed(2) + s[e];	
		} else {
			return 0;
		}
	}
	
	$scope.getRefresh=function() {
		return $scope.refresh;
	}

	$scope.displayInfo=function(title,info) {
		$scope.modal.title = title;
		$scope.modal.info = JSON.stringify(info, undefined, 4);
		$('#modal_info').modal({show:true,backdrop:false});
	}
	
	$scope.setCluster=function(cluster) {
		$scope.cluster = cluster;
	}
	$scope.setAlert=function(alert) {
		$scope.alert = alert;
	}
}

function ClusterOverviewCtrl($scope, $location, $timeout) {
	$scope.pagination= new Pagination(1,"", []);
	(function loadClusterState() {
    	$timeout(loadClusterState, $scope.getRefresh());
		if ($scope.modal.active == false) { // only refreshes if no modal is active
    		$scope.setCluster(getClusterState($scope.host));
			$scope.pagination.setResults($scope.cluster.indices);
		}
	}());
	
	$scope.shutdownNode=function(node_id) {
		return shutdownNode($scope.host,node_id);
	}
	
	$scope.getNodes=function() {
		return $scope.cluster.getNodes($scope.pagination.data,$scope.pagination.master,$scope.pagination.client);
	}

	$scope.optimizeIndex=function(index){
		var response = optimizeIndex($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index was successfully optimized", "Error while optimizing index", response.response));
		$scope.closeModal();
	}
	
	$scope.deleteIndex=function(index){
		var response = deleteIndex($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index was successfully deleted", "Error while deleting index", response.response));
		$scope.closeModal();
	}
	
	$scope.clearCache=function(index) {
		var response = clearCache($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index cache was successfully cleared","Error while clearing index cache", response.response));
		$scope.closeModal();
	}

	$scope.refreshIndex=function(index){
		var response = refreshIndex($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index was successfully refreshed","Error while refreshing index", response.response));
		$scope.closeModal();
	}
	
	$scope.flipDisableAllocation=function(current_state) {
		var response = flipDisableShardAllocation($scope.host,current_state);
		if (current_state) {
			$scope.setAlert(new Alert(response.response,"Shard allocation was enabled","Error while enabling shard allocation", response.response));
		} else {
			$scope.setAlert(new Alert(response.response,"Shard allocation was disabled","Error while disabling shard allocation", response.response));			
		}
	}
	
	$scope.switchIndexState=function(index,state) {
		if (state === "close") {
			var response = openIndex($scope.host,index);
			$scope.setAlert(new Alert(response.success,"Index was successfully opened","Error while opening index",response.response));
		} else {
			var response =closeIndex($scope.host,index);			
			$scope.setAlert(new Alert(response.success,"Index was successfully closed","Error while closing index",response.response));
		}
		$scope.closeModal();
	}
}

/**
* Represents an on screen alert.
* Alerts have a level(success, error) and a message.
* Optionally, alerts may also have a server response
**/
function Alert(success, success_message, error_message, response) {
	if (success) {
		this.level = 'success';
		this.message = success_message;
	} else {
		this.level = 'error';
		this.message = error_message;
	}
	if (response != null) {
		this.response = JSON.stringify(response, undefined, " ");
	}
	this.hasServerResponse=function() {
		return this.response != null;
	}
	this.clear=function() {
		this.level = null;
		this.message = null;
	}
}

function Pagination(page, query, results) {
	this.page = page;
	this.page_size = 4; // constant?
	this.results = results; // should not be accessed directly
	this.query = query;
	this.data = true;
	this.master = true;
	this.client = true;
	
	this.firstResult=function() {
		if (this.getResults().length > 0) {
			return ((this.current_page() - 1) * this.page_size) + 1;
		} else {
			return 0;
		}
	}
	
	this.lastResult=function() {
		if (this.current_page() * this.page_size > this.getResults().length) {
			return this.getResults().length;
		} else {
			return this.current_page() * this.page_size;
		}
	}

	this.hasNextPage=function() {
		return this.page_size * this.current_page() < this.getResults().length;
	}
	
	this.hasPreviousPage=function() {
		return this.current_page() > 1;
	}
	this.nextPage=function() {
		this.page += 1;
	}
	this.previousPage=function() {
		this.page -= 1;
	}
	
	this.total=function() {
		return this.getResults().length;
	}
	
	this.current_page=function() {
		if (this.query != this.previous_query) {
			this.previous_query = this.query;
			this.page = 1;
		}
		return this.page;
	}
	
	this.getPage=function() {
		var count = 1;
		var first_result = this.firstResult();
		var last_result = this.lastResult();
		var page = $.map(this.getResults(),function(i) {
			if (count < first_result || count > last_result) {
				count += 1;
				return null;
			}
			count += 1;
			return i;
		});
		return page;
	}
	
	this.setResults=function(results) {
		this.results = results;
	}
	
	this.getResults=function() {
		var query = this.query;
		return $.map(this.results,function(i) {
			if (typeof query != 'undefined' && query.length > 0) {
				if (i.name.indexOf(query) != -1) {
					return i;
				} else {
					return null;
				}
			} else {
				return i;
			}
		});
	}
}

/* Controls modals */
function ModalControls() {
	this.alert = null;
	this.active = false;
	this.title = '';
	this.info = '';
}