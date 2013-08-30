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
	return '<div class=\"json-content\"">' + beautifulJsonObject(data) + '</div>';
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
				content += '<div>' + formatValue(x)+ '</div>';
			} else {
				content += '<div>' + formatValue(x)+ ',</div>';	
			}
		});	
	} else {
		var properties = Object.keys(data);
		properties.map(function(x) { 
			if (properties[properties.length - 1] == x) { // dont add the comma
				content += '<div><span class="json-property">"'+x+"</span> : " + formatValue(data[x])+ '</div>';
			} else {
				content += '<div><span class="json-property">"'+x+"</span> : " + formatValue(data[x])+ ',</div>';	
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
			if (response.success) {
				$scope.broadcastMessage('refreshClusterView', {});
			}
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
				if (response.success) {
					$scope.broadcastMessage('refreshClusterView', {});
				}
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
		if (response.success) {
			$scope.broadcastMessage('refreshClusterView', {});
		}
	};
}

function NavbarController($scope, $location, $timeout) {
	
	$scope.new_refresh = $scope.getRefresh();
	
	$scope.connectToHost=function() {
		$scope.setClusterHealth();
		$scope.setHost($scope.new_host);
	}
	
	$scope.changeRefresh=function() {
		$scope.setRefresh($scope.new_refresh);
	}

	$scope.changeTab=function() {
		$scope.clearAlert();
	}
	$scope.selectAnalysisTab=function() {
		$scope.clearAlert();
		$scope.broadcastMessage('loadAnalysisEvent', {});
	}
	
	
	$scope.selectAliasesTab=function() {
		$scope.clearAlert();
		$scope.broadcastMessage('loadAliasesEvent', {});
	}
}

function Request() {
	this.url = '';
	this.method = 'GET';
	this.body = ''
}

function AliasesCtrl($scope, $location, $timeout) {

	$scope.new_alias = '';
	$scope.aliases = null;
	$scope.new_index = {};
	
	$scope.addAlias=function() {
		if (typeof $scope.new_alias != 'undefined' && $scope.new_alias.trim().length > 0) {
			$scope.aliases.info[$scope.new_alias] = [];
			$scope.new_alias = '';
		}
	}
	
	$scope.addIndexToAlias=function(target_alias) {
		if (typeof $scope.new_index[target_alias] != 'undefined' && $scope.new_index[target_alias].length > 0) {
			$.each($scope.aliases.info,function(alias,indices) {
				if (alias === target_alias) {
					if (indices.indexOf($scope.new_index[alias]) == -1) {
						$scope.aliases.info[alias].push($scope.new_index[alias]);
						$scope.new_index[alias] = '';
					}
				} 
			});
		}
	}
	
	$scope.removeAlias=function(alias) {
		delete $scope.aliases.info[alias];
	}
	
	$scope.removeAliasFromIndex=function(index, alias) {
		$scope.aliases.info[alias].splice($scope.aliases.info[alias].indexOf(index),1);
	}
	
	$scope.mergeAliases=function() {
		var deletes = [];
		var adds = [];
		Object.keys($scope.aliases.info).forEach(function(alias) {
			var indices = $scope.aliases.info[alias];
			indices.forEach(function(index) {
				if (typeof $scope.originalAliases.info[alias] == 'undefined' || $scope.originalAliases.info[alias].indexOf(index) == -1) {
					adds.push({'alias':alias,'index':index});
				} 
			});
		});
		Object.keys($scope.originalAliases.info).forEach(function(alias) {
			var indices = $scope.originalAliases.info[alias];
			indices.forEach(function(index) {
				// if alias didnt exist in original aliases, all alias x index need to be added
				if (typeof $scope.aliases.info[alias] == 'undefined' || $scope.aliases.info[alias].indexOf(index) == -1) {
					deletes.push({'alias':alias,'index':index});
				} 
			});
		});
		var response = updateAliases($scope.host,adds,deletes);
		$scope.loadAliases();
		$scope.setAlert(new Alert(response.success, "Aliases were successfully updated","Error while updating aliases",response.response));
	}
	
	$scope.loadAliases=function() {
		$scope.originalAliases = fetchAliases($scope.host);
		$scope.aliases = jQuery.extend(true, {}, $scope.originalAliases);
	}
	
	$scope.$on('hostChanged',function() {
		$scope.loadAliases();
	});
	
    $scope.$on('loadAliasesEvent', function() {
		$scope.loadAliases();
    });

}

function RestCtrl($scope, $location, $timeout) {
	$scope.request = new Request();
	
	$scope.sendRequest=function() {
		var response = syncRequest($scope.request.method,$scope.request.url,$scope.request.body);
		if (response.success) {
			var content = beautifulJson(response.response);
			$('#rest-client-response').html(content);
			$scope.setAlert(null);
		} else {
			try {
				var parsed = JSON.parse(response.response['responseText']);
				var alert = new Alert(false, "", "Error while executing request", parsed);
				$scope.setAlert(alert);
				$('#rest-client-response').html('');
			} catch (err) {
				var alert = new Alert(false, "", "Executing this request did not return a valid JSON", response.response['responseText']);
				$scope.setAlert(alert);
				$('#rest-client-response').html('');
			}
		}
	}
	$scope.templates = [
		{'key':"search + filter + facets + +highlight + sort",'value':JSON.stringify(JSON.parse('{ "query" : { "term" : { "field" : "value" } }, "filter" : { "term" : { "field_name" : "value" } }, "facets" : { "facet_name" : { "terms" : { "field" : "field_name" } } }, "sort" : [ { "field_name" : {"order" : "asc"} } ], "highlight" : { "fields" : { "field_name" : {"fragment_size" : 150, "number_of_fragments" : 3} } }, "from" : 0, "size" : 10 }'), undefined, 4)},
		{'key':"bool query",'value':JSON.stringify(JSON.parse('{"query" : { "bool" : { "must" : { "term" : { "field" : "value" } }, "must_not" : { "term" : { "field" : "value" } }, "should" : [ {"term" : { "field" : "value" }} ], "minimum_should_match" : 1, "boost" : 1.0 } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
		{'key':"ids query",'value':JSON.stringify(JSON.parse('{"query": { "ids" : { "type" : "document_type", "values" : ["1", "2","3"] } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)}
	];
}

function AnalysisCtrl($scope, $location, $timeout) {
	
	$scope.indices = {};
	$scope.field_index = '';
	$scope.field_type = '';
	$scope.field_field = '';
	$scope.field_text = '';
	$scope.field_tokens = [];
	
	// By analyzer
	$scope.analyzer_index = '';
	$scope.analyzer_analyzer = '';
	$scope.analyzer_text = '';
	
	$scope.analyzeByField=function() {
		if ($scope.field_field.length > 0 && $scope.field_text.length > 0) {
			var response = analyzeByField($scope.host,$scope.field_index,$scope.field_type,$scope.field_field,$scope.field_text);
			$scope.field_tokens = response.response['tokens'];
		}
	}
	
	$scope.analyzeByAnalyzer=function() {
		if ($scope.analyzer_analyzer.length > 0 && $scope.analyzer_text.length > 0) {
			var response = analyzeByAnalyzer($scope.host,$scope.analyzer_index,$scope.analyzer_analyzer,$scope.analyzer_text);
			if (response.success) {
				$scope.analyzer_tokens = response.response['tokens'];				
			} else {
				$scope.setAlert(new Alert(false, "","Error while analyzing text",response.response));
			}
		}
	}
	
	$scope.getTypes=function() {
		if (typeof $scope.indices[$scope.field_index] != 'undefined') {
			return $scope.indices[$scope.field_index]['types'];
		}
	}
	
	$scope.getAnalyzers=function() {
		if (typeof $scope.indices[$scope.analyzer_index]  != 'undefined') {
			return $scope.indices[$scope.analyzer_index]['analyzers'];
		}
	}

	$scope.getFields=function() {
		if (typeof $scope.indices[$scope.field_index] != 'undefined') {
			return $scope.indices[$scope.field_index]['types'][$scope.field_type];
		} 
	}	
	
	$scope.$on('hostChanged',function() {
		$scope.loadAnalysisData();
	});
	
    $scope.$on('loadAnalysisEvent', function() {
		$scope.loadAnalysisData();
    });
	
	$scope.loadAnalysisData=function() {
		var response = getClusterState($scope.host);
		Object.keys(response.response['metadata']['indices']).forEach(function(index) {
			$scope.indices[index] = {};
			var indexData = response.response['metadata']['indices'][index]['mappings'];
			$scope.indices[index]['types'] = {};
			Object.keys(indexData).forEach(function(type) {
				$scope.indices[index]['types'][type] = [];
			Object.keys(indexData[type]['properties']).forEach(function(property) {
				$scope.indices[index]['types'][type].push(property);
			})
			});
			
			var indexSettings = response.response['metadata']['indices'][index]['settings'];
			$scope.indices[index]['analyzers'] = [];
			Object.keys(indexSettings).forEach(function(setting) {
				if (setting.indexOf('index.analysis.analyzer') == 0) {
					var analyzer = setting.substring('index.analysis.analyzer.'.length);
					analyzer = analyzer.substring(0,analyzer.indexOf("."));
					if ($.inArray(analyzer, $scope.indices[index]['analyzers']) == -1) {
						$scope.indices[index]['analyzers'].push(analyzer);
					}
				}
			});
			
		});
	}
}

/* Main controller, all should inherit from this */
function GlobalController($scope, $location, $timeout) {
	if ($location.host() == "") {
		$scope.host = "http://localhost:9200";
	} else {
		$scope.host = "http://" + $location.host() + ":" + $location.port();
	}
	$scope.refresh = 3000;
	$scope.modal = new ModalControls();
	$scope.alert = null;
	$scope.cluster_health = null; // cluster health should be refresh at all moments

	(function loadClusterHealth() {
    	$timeout(loadClusterHealth, $scope.refresh);
		getClusterHealth($scope.host, 
			function(cluster) {
				if ($scope.cluster_health == null) {
					$scope.clearAlert();
				}
				$scope.cluster_health = cluster;
			},
			function(error_response) {
				$scope.cluster_health = null;
				$scope.alert = new Alert(false, "","Error connecting to [" + $scope.host + "]",error_response);
			}
		);
	}());
	
	$scope.hasConnection=function() {
		return $scope.cluster_health != null;
	}
	
	$scope.setClusterHealth=function(cluster_health) {
		$scope.cluster_health = cluster_health;
	}
	
	$scope.broadcastMessage=function(message,args) {
		$scope.$broadcast(message,args);
	}
	
	$scope.isActive=function(tab) {
		return $('#' + tab).hasClass('active');
	}
	
	$scope.setHost=function(host) {
		$scope.host = host;
		$scope.broadcastMessage('hostChanged',{});
	}
	
	$scope.setRefresh=function(refresh) {
		$scope.refresh = refresh;
	}
	
	$scope.getRefresh=function() {
		return $scope.refresh;
	}

	$scope.clearAlert=function() {
		$scope.alert = null;
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

	$scope.displayInfo=function(title,info) {
		$scope.modal.title = title;
		$scope.modal.info = JSON.stringify(info, undefined, 4);
		$('#modal_info').modal({show:true,backdrop:false});
	}
	
	$scope.setAlert=function(alert) {
		$scope.alert = alert;
	}
	
	$scope.isInModal=function() {
		return ($('.modal-backdrop').length > 0);
	}
}

function ClusterOverviewCtrl($scope, $location, $timeout) {
	$scope.pagination= new Pagination(1,"", []);
	
	$scope.cluster = null;
	
	$scope.force_refresh = false;
	
	(function loadClusterState() {
		
		$scope.updateCluster=function() {
			// avoids requesting when info is not viewable
			if (!$scope.isInModal()) { // only refreshes if no modal is active
				var is_current_view = ($("#cluster_option").length > 0) ? $scope.isActive('cluster_option') : true;
				if (is_current_view) {
					getClusterDetail($scope.host, function(cluster) {
						if (!$scope.isInModal()) {
							$scope.$apply(function() { // forces view refresh
								$scope.cluster = cluster;
								$scope.pagination.setResults(cluster.indices);
							});
							$scope.force_refresh = false;
						} 
					});
				} 
			}
			if ($scope.force_refresh) {
				$scope.forceRefresh();
			}
		}
		$timeout(loadClusterState, $scope.getRefresh());	
		$scope.updateCluster();
	}());
	
	
    $scope.$on('refreshClusterView', function() {
		$scope.forceRefresh();
    });
	
	$scope.openModal=function(){
		
	}
	$scope.closeModal=function(force_refresh){
		$scope.modal.alert = null;
		if (force_refresh) {
			$scope.forceRefresh();
		}
	}
	
	$scope.forceRefresh=function() {
		$scope.force_refresh = true;
		$timeout(function() { $scope.updateCluster() }, 100);
	}
	
	$scope.ready=function() {
		return $scope.cluster != null;
	}
	
	$scope.shutdownNode=function(node_id) {
		return shutdownNode($scope.host,node_id);
	}
	
	$scope.getNodes=function() {
		return $scope.cluster.getNodes($scope.pagination.data,$scope.pagination.master,$scope.pagination.client);
	}

	$scope.optimizeIndex=function(index){
		var response = optimizeIndex($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index was successfully optimized", "Error while optimizing index", response.response));
		$scope.closeModal(false);
	}
	
	$scope.deleteIndex=function(index){
		var response = deleteIndex($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index was successfully deleted", "Error while deleting index", response.response));
		$scope.closeModal(true);
	}
	
	$scope.clearCache=function(index) {
		var response = clearCache($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index cache was successfully cleared","Error while clearing index cache", response.response));
		$scope.closeModal(false);
	}

	$scope.refreshIndex=function(index){
		var response = refreshIndex($scope.host,index);
		$scope.setAlert(new Alert(response.success, "Index was successfully refreshed","Error while refreshing index", response.response));
		$scope.closeModal(false);
	}
	
	$scope.flipDisableAllocation=function(current_state) {
		var response = flipDisableShardAllocation($scope.host,current_state);
		if (current_state) {
			$scope.setAlert(new Alert(response.response,"Shard allocation was enabled","Error while enabling shard allocation", response.response));
		} else {
			$scope.setAlert(new Alert(response.response,"Shard allocation was disabled","Error while disabling shard allocation", response.response));			
		}
		$scope.forceRefresh();
	}
	
	$scope.switchIndexState=function(index,state) {
		if (state === "close") {
			var response = openIndex($scope.host,index);
			$scope.setAlert(new Alert(response.success,"Index was successfully opened","Error while opening index",response.response));
		} else {
			var response =closeIndex($scope.host,index);			
			$scope.setAlert(new Alert(response.success,"Index was successfully closed","Error while closing index",response.response));
		}
		$scope.closeModal(true);
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
		this.response = JSON.stringify(response, undefined, 4);
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