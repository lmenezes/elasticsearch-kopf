var jsonTree = new JSONTree();
function CreateIndexCtrl($scope, $location, $timeout) {
	$scope.settings = '';
	$scope.shards = '';
	$scope.replicas = '';
	$scope.name = '';
	
	$scope.createIndex=function() {
		try {
			if ($scope.name.trim().length == 0) {
				$scope.modal.alert = new Alert(false, "You must specify a valid index name", null);	
			} else {
				var settings = {};
				if ($scope.settings.trim().length > 0) {
					try {
						settings = JSON.parse($scope.settings);
					} catch (error) {
						throw "Invalid JSON: " + error;
					}
				} 
				if (!isDefined(settings['settings'])) {
					settings = {"settings":settings};
				} 
				if (!isDefined(settings['settings']['index'])) {
					settings['settings']['index'] = {};
				} 
				var index_settings = settings['settings']['index'];
				if (!isDefined(index_settings['number_of_shards']) && $scope.shards.length > 0) {
					index_settings['number_of_shards'] = $scope.shards;
				}
				if (!isDefined(index_settings['number_of_replicas']) && $scope.replicas.length > 0) {
					index_settings['number_of_replicas'] = $scope.replicas;
				}
				var response = createIndex($scope.host,$scope.name, JSON.stringify(settings, undefined, ""));
				$scope.modal.alert = new Alert(true, 'Index successfully created', response);
				$scope.broadcastMessage('forceRefresh', {});
			}
		} catch(error) {
			$scope.modal.alert = new Alert(false, "Error while creating index", error);
		}
	}
	
	$scope.prepareCreateIndex=function() {
		$scope.settings = '';
		$scope.shards = '';
		$scope.name = '';
		$scope.replicas = '';
	}
}

function ClusterOverviewCtrl($scope, $location, $timeout) {
	$scope.pagination= new Pagination(1,"", []);
	$scope.cluster = null;
	
	(function loadClusterState() {
		
		$scope.isCurrentView=function() {
			return ($("#cluster_option").length > 0) ? $scope.isActive('cluster_option') : true;
		}
		
		$scope.updateCluster=function(is_forced_refresh) {
			var forced_refresh = is_forced_refresh;
			if (!$scope.isInModal()) { // only refreshes if no modal is active
				if ($scope.isCurrentView()) {
					getClusterDetail($scope.host, function(cluster) {
						if (!$scope.isInModal()) {
							$scope.$apply(function() { // forces view refresh
								$scope.cluster = cluster;
								$scope.pagination.setResults(cluster.indices);
							});
							forced_refresh = false;
						} else {
							if (forced_refresh) {
								$scope.forcedRefresh();
							}
						}
					});
				} else {
					if (forced_refresh) {
						$scope.forcedRefresh();
					}
				}
			} else {
				if (forced_refresh) {
					$scope.forcedRefresh();
				}
			}
		}
		$timeout(loadClusterState, $scope.getRefresh());	
		$scope.updateCluster(false);
	}());
	
	
	$scope.getNodes=function() {
		return $scope.cluster.getNodes($scope.pagination.data,$scope.pagination.master,$scope.pagination.client);
	}
	
    $scope.$on('forceRefresh', function() {
		$scope.forcedRefresh();
    });
	
	// not to mistake with forceRefresh, which invokes a global refresh
	$scope.forcedRefresh=function() {
		$timeout(function() { $scope.updateCluster(true) }, 100);
	}
	
	$scope.closeModal=function(forced_refresh){
		$scope.modal.alert = null;
		if (forced_refresh) {
			$scope.forceRefresh(); // broadcasts so every controller gets the forceRefresg
		}
	}
	
	// actions invoked from view
	
	$scope.displayClusterHealth=function() {
		$scope.broadcastMessage('loadClusterHealth',{});
	}
	
	$scope.shutdownNode=function(node_id) {
		try {
			var response = shutdownNode($scope.host,node_id);
			$scope.setAlert(new Alert(true,"Node [" + node_id + "] successfully shutdown",response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false,"Error while shutting down node",error));
		}
	}

	$scope.optimizeIndex=function(index){
		try {
			var response = optimizeIndex($scope.host,index);
			$scope.setAlert(new Alert(true, "Index was successfully optimized", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while optimizing index", error));
		}
		$scope.closeModal(false);
	}
	
	$scope.deleteIndex=function(index){
		try {
			var response = deleteIndex($scope.host,index);
			$scope.setAlert(new Alert(true, "Index was successfully deleted", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while deleting index", error));	
		}
		$scope.closeModal(true);
	}
	
	$scope.clearCache=function(index) {
		try {
			var response = clearCache($scope.host,index);
			$scope.setAlert(new Alert(true, "Index cache was successfully cleared", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while clearing index cache", error));	
		}
		$scope.closeModal(false);
	}

	$scope.refreshIndex=function(index){
		try {
			var response = refreshIndex($scope.host,index);
			$scope.setAlert(new Alert(true, "Index was successfully refreshed", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while refreshing index", error));	
		}
		$scope.closeModal(false);
	}
	
	$scope.enableAllocation=function() {
		try {
			var response = enableShardAllocation($scope.host);
			$scope.setAlert(new Alert(true, "Shard allocation was successfully enabled", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while enabling shard allocation", error));	
		}
		$scope.forceRefresh();
	}
	
	$scope.disableAllocation=function(current_state) {
		try {
			var response = disableShardAllocation($scope.host);
			$scope.setAlert(new Alert(true, "Shard allocation was successfully disabled", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while disabling shard allocation", error));	
		}
		$scope.forceRefresh();
	}
	
	$scope.closeIndex=function(index) {
		try {
			var response = closeIndex($scope.host,index);
			$scope.setAlert(new Alert(true, "Index was successfully closed", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while closing index", error));	
		}
		$scope.closeModal(true);
	}
	
	$scope.openIndex=function(index) {
		try {
			var response = openIndex($scope.host,index);
			$scope.setAlert(new Alert(true, "Index was successfully opened", response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while opening index", error));	
		}
		$scope.closeModal(true);
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

	$scope.saveSettings=function(index_name) {
		try {
			$scope.cluster.indices.forEach(function(index) { 
				if (index.name === index_name) {
					var new_settings = {};
					allowed_properties.forEach(function(setting) {
						if (isDefined(index.settings[setting]) && index.settings[setting].length > 0) {
							new_settings[setting] = index.settings[setting];
						}
					});
					var response = updateIndexSettings($scope.host, index.name, JSON.stringify(new_settings, undefined, ""));
					$scope.modal.alert = new Alert(true, "Index settings were successfully updated", response.response);
					$scope.broadcastMessage('forceRefresh', {});
				}
			});
		} catch (error) {
			$scope.modal.alert = new Alert(false, "Error while updating index settings", error);
		}
	}
}

function ClusterSettingsCtrl($scope, $location, $timeout) {
	$scope.saveClusterSettings=function() {
		try {
			var new_settings = {};
			new_settings['transient'] = $scope.cluster.settings;
			var response = updateClusterSettings($scope.host, JSON.stringify(new_settings, undefined, ""));
			$scope.modal.alert = new Alert(true, "Cluster settings were successfully updated",response.response);
			$scope.broadcastMessage('forceRefresh', {});
		} catch (error) {
			$scope.modal.alert = new Alert(false, "Error while updating cluster settings",error);
		}
	}
}

function NavbarController($scope, $location, $timeout) {
	
	$scope.new_refresh = $scope.getRefresh();
	$scope.cluster_health = null;
	
	(function loadClusterHealth() {
		
		$scope.updateClusterHealth=function() {
			getClusterHealth($scope.host, 
				function(cluster) {
					if ($scope.cluster_health == null) {
						$scope.clearAlert();
					}
					$scope.cluster_health = cluster;
					$scope.setConnected(true);
				},
				function(error_response) {
					$scope.cluster_health = null;
					$scope.setConnected(false);
					$scope.alert = new Alert(false, "Error connecting to [" + $scope.host + "]",error_response);
				}
			);
		}
		
    	$timeout(loadClusterHealth, $scope.refresh);
		$scope.updateClusterHealth();
	}());
	
    $scope.$on('forceRefresh', function() {
		$scope.updateClusterHealth();
    });
	
    $scope.connectToHost=function() {
		if (isDefined($scope.new_host) && $scope.new_host.length > 0) {
			$scope.setHost($scope.new_host);
			$scope.cluster_health = null;
			$scope.updateClusterHealth();
		}
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
	
	$scope.selectDiagnosisTab=function() {
		$scope.clearAlert();
		$scope.broadcastMessage('loadDiagnosisEvent', {});
	}
}

function AliasesCtrl($scope, $location, $timeout) {
	$scope.new_alias = '';
	$scope.aliases = null;
	$scope.new_index = {};
	
	$scope.addAlias=function() {
		if (isDefined($scope.new_alias) && $scope.new_alias.trim().length > 0) {
			$scope.aliases.info[$scope.new_alias] = [];
			$scope.new_alias = '';
		}
	}
	
	$scope.addIndexToAlias=function(target_alias) {
		if (isDefined($scope.new_index[target_alias]) && $scope.new_index[target_alias].length > 0) {
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
		try {
			var deletes = [];
			var adds = [];
			Object.keys($scope.aliases.info).forEach(function(alias) {
				var indices = $scope.aliases.info[alias];
				indices.forEach(function(index) {
					if (!isDefined($scope.originalAliases.info[alias]) || $scope.originalAliases.info[alias].indexOf(index) == -1) {
						adds.push({'alias':alias,'index':index});
					} 
				});
			});
			Object.keys($scope.originalAliases.info).forEach(function(alias) {
				var indices = $scope.originalAliases.info[alias];
				indices.forEach(function(index) {
					if (!isDefined($scope.aliases.info[alias]) || $scope.aliases.info[alias].indexOf(index) == -1) {
						deletes.push({'alias':alias,'index':index});
					} 
				});
			});
			var response = updateAliases($scope.host,adds,deletes);
			$scope.loadAliases();
			$scope.setAlert(new Alert(true, "Aliases were successfully updated",response.response));
		} catch (error) {
			$scope.setAlert(new Alert(false, "Error while updating aliases",error));
		}
	}
	
	$scope.loadAliases=function() {
		try {
			$scope.originalAliases = fetchAliases($scope.host);
			$scope.aliases = jQuery.extend(true, {}, $scope.originalAliases);
		} catch (error) {
			$scope.setAlert(new Alert(false,"","Error while fetching aliases",error));
		}
	}
	
	$scope.$on('hostChanged',function() {
		$scope.loadAliases();
	});
	
    $scope.$on('loadAliasesEvent', function() {
		$scope.loadAliases();
    });

}

function ClusterHealthCtrl($scope,$location,$timeout) {
	$scope.shared_url = '';
	$scope.cluster_health = {};
	$scope.state = '';
	
    $scope.$on('loadClusterHealth', function() {
		$scope.cluster_health = null; // otherwise we see past version, then new
		$scope.state = ''; // informs about loading state
    });
	
	$scope.loadClusterHealth=function() {
		var cluster_health = null;
		$scope.cluster_health = null; // otherwise we see past version, then new
		$scope.state = "loading cluster health state. this could take a few moments..."
		getClusterDiagnosis($scope.host,
			function(state, stats, hot_threads) {
				cluster_health = {};
				cluster_health['state'] = JSON.stringify(state, undefined, 4);
				cluster_health['stats'] = JSON.stringify(stats, undefined, 4);
				cluster_health['hot_threads'] = hot_threads;
				$scope.cluster_health = cluster_health;
				$scope.state = '';
			},
			function(failed_request) {
				$scope.state = '';
				$scope.modal.alert = new Alert(false, "Error while retrieving cluster health information", failed_request.responseText);
		});
	}

	$scope.publishClusterHealth=function() {
		var gist = {};
		gist['description'] = 'Cluster information delivered by kopf';
		gist['public'] = true;
		gist['files'] = {};
		gist['files']['state'] = {'content': $scope.cluster_health['state'],'indent':'2', 'language':'JSON'};
		gist['files']['stats'] = {'content': $scope.cluster_health['stats'],'indent':'2', 'language':'JSON'} ;
		gist['files']['hot_threads'] = {'content':$scope.cluster_health['hot_threads'],'indent':'2', 'language':'JSON'};
		var data = JSON.stringify(gist, undefined, 4);
		$.ajax({ type: 'POST', url: "https://api.github.com/gists", dataType: 'json', data: data, async: false})
			.done(function(response) { 
				$scope.modal.alert = new Alert(true, "Cluster health information successfully shared", "Gist available at : " + response.html_url);
			})
			.fail(function(response) {
				$scope.modal.alert = new Alert(false, "Error while publishing Gist", response.responseText);
			}
		);
	}
}

function RestCtrl($scope, $location, $timeout) {
	$scope.request = new Request();
	$scope.validation_error = null;
	$scope.request.url = $scope.host + "/_search";
	
	$scope.formatBody=function() {
		try {
			if (notEmpty($scope.request.body)) {
				$scope.validation_error = null;
				var bodyObject = JSON.parse($scope.request.body);
				var formattedBody = JSON.stringify(bodyObject,undefined,4);
				$scope.request.body = formattedBody;
			}
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	}
	
	$scope.sendRequest=function() {
		$scope.formatBody();
		$scope.clearAlert();
		$('#rest-client-response').html('');
		if ($scope.validation_error == null && notEmpty($scope.request.url)) {
			try {
				var response = syncRequest($scope.request.method,$scope.request.url,$scope.request.body);
				if (response.success) {
					var content = jsonTree.create(response.response);
					$('#rest-client-response').html(content);
				} else {
					try {
						var content = jsonTree.create(JSON.parse(response.response.responseText));
						$('#rest-client-response').html(content);
					} catch (error) {
						$scope.setAlert(new Alert(false, "Request did not return a valid JSON", response.response.responseText));
					}
				}
			} catch (error) {
				$scope.setAlert(new Alert(false, "Error while executing request", error));
			}
		}
	}
	// maybe allow storing queries in ES? would need some kind of security
	$scope.templates = [
		{'key':"search + filter + facets + +highlight + sort",'value':JSON.stringify(JSON.parse('{ "query" : { "term" : { "field" : "value" } }, "filter" : { "term" : { "field_name" : "value" } }, "facets" : { "facet_name" : { "terms" : { "field" : "field_name" } } }, "sort" : [ { "field_name" : {"order" : "asc"} } ], "highlight" : { "fields" : { "field_name" : {"fragment_size" : 150, "number_of_fragments" : 3} } }, "from" : 0, "size" : 10 }'), undefined, 4)},
		{'key':"bool query",'value':JSON.stringify(JSON.parse('{"query" : { "bool" : { "must" : { "term" : { "field" : "value" } }, "must_not" : { "term" : { "field" : "value" } }, "should" : [ {"term" : { "field" : "value" }} ], "minimum_should_match" : 1, "boost" : 1.0 } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
		{'key':"ids query",'value':JSON.stringify(JSON.parse('{"query": { "ids" : { "type" : "document_type", "values" : ["1", "2","3"] } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
	];
}

function AnalysisCtrl($scope, $location, $timeout) {
	$scope.indices = {};

	// by index
	$scope.field_index = '';
	$scope.field_type = '';
	$scope.field_field = '';
	$scope.field_text = '';
	$scope.field_tokens = [];
	
	// By analyzer
	$scope.analyzer_index = '';
	$scope.analyzer_analyzer = '';
	$scope.analyzer_text = '';
	$scope.analyzer_tokens = [];
	
	$scope.analyzeByField=function() {
		if ($scope.field_field.length > 0 && $scope.field_text.length > 0) {
			try {
				$scope.field_tokens = analyzeByField($scope.host,$scope.field_index,$scope.field_type,$scope.field_field,$scope.field_text);
				$scope.clearAlert();
			} catch (error) {
				$scope.field_tokens = null;
				$scope.setAlert(new Alert(false, "Error while analyzing text", error));
			}
		}
	}
	
	$scope.analyzeByAnalyzer=function() {
		if ($scope.analyzer_analyzer.length > 0 && $scope.analyzer_text.length > 0) {
			try {
				$scope.analyzer_tokens = analyzeByAnalyzer($scope.host,$scope.analyzer_index,$scope.analyzer_analyzer,$scope.analyzer_text);
				$scope.clearAlert();
			} catch (error) {
				$scope.analyzer_tokens = null;
				$scope.setAlert(new Alert(false, "Error while analyzing text", error));
			}
		}
	}
	
	$scope.getTypes=function() {
		if (isDefined($scope.indices[$scope.field_index])) {
			return $scope.indices[$scope.field_index]['types'];
		}
	}
	
	$scope.getAnalyzers=function() {
		if (isDefined($scope.indices[$scope.analyzer_index])) {
			return $scope.indices[$scope.analyzer_index]['analyzers'];
		}
	}

	$scope.getFields=function() {
		if (isDefined($scope.indices[$scope.field_index])) {
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
		try {
			var response = getClusterState($scope.host);
			Object.keys(response.response['metadata']['indices']).forEach(function(index) {
				$scope.indices[index] = {};
				var indexData = response.response['metadata']['indices'][index]['mappings'];
				$scope.indices[index]['types'] = {};
				Object.keys(indexData).forEach(function(type) {
					$scope.indices[index]['types'][type] = [];
					Object.keys(indexData[type]['properties']).forEach(function(property) {
						$scope.indices[index]['types'][type].push(property);
					});
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
		} catch (error) {
			$scope.setAlert(new Alert(false,"Error while reading analyzers information from cluster", error));
		}
	}
}

function GlobalController($scope, $location, $timeout) {
	$scope.version = "0.1";
	
	if ($location.host() == "") { // when opening from filesystem
		$scope.host = "http://localhost:9200";
	} else {
		$scope.host = $location.protocol() + "://" + $location.host() + ":" + $location.port();
	}
	$scope.refresh = 3000;
	$scope.modal = new ModalControls();
	$scope.alert = null;
	$scope.is_connected = false;

	// should be called when an action could change status/topology of cluster
	$scope.forceRefresh=function() {
		$scope.broadcastMessage('forceRefresh',{});
	}

	$scope.hasConnection=function() {
		return $scope.is_connected;
	}
	
	$scope.setConnected=function(status) {
		$scope.is_connected = status;
	}

	$scope.broadcastMessage=function(message,args) {
		$scope.$broadcast(message,args);
	}
	
	$scope.isActive=function(tab) {
		return $('#' + tab).hasClass('active');
	}
	
	$scope.setHost=function(host) {
		$scope.host = host;
		$scope.setConnected(false);
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
		$scope.modal.info = jsonTree.create(info);
		$('#modal_info').modal({show:true,backdrop:false});
	}
	
	$scope.setAlert=function(alert) {
		$scope.alert = alert;
	}
	
	$scope.isInModal=function() {
		return ($('.modal-backdrop').length > 0);
	}
}

function Request() {
	this.url = '';
	this.method = 'GET';
	this.body = ''
	
	this.clear=function() {
		this.url = '';
		this.method = '';
		this.body = '';
	}
}

function Alert(success, message, response) {
	if (success) {
		this.level = 'success';
	} else {
		this.level = 'error';
	}
	this.message = message;
	if (response != null) {
		this.response = JSON.stringify(response, undefined, 2);
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
	this.page_size = 4;
	this.results = results;
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
			if (isDefined(query) && query.length > 0) {
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

function ModalControls() {
	this.alert = null;
	this.active = false;
	this.title = '';
	this.info = '';
}

function isDefined(value) {
	return typeof value != 'undefined';
}

function notEmpty(value) {
	return isDefined(value) && value != null && value.trim().length > 0;
}

function hierachyJson(json) {
	var jsonObject = JSON.parse(json);
	var resultObject = {};
	Object.keys(jsonObject).forEach(function(key) {
		var parts = key.split(".");
		var property = null;
		var reference = resultObject;
		var previous = null;
		for (var i = 0; i<parts.length; i++) {
			if (i == parts.length - 1) {
				if (isNaN(parts[i])) {
					reference[parts[i]] = jsonObject[key];	
				} else {
					if (!(previous[property] instanceof Array)) {
						previous[property] = [];
					}
					previous[property].push(jsonObject[key]);
				}
			} else {
				property = parts[i];
				if (!isDefined(reference[property])) {
					reference[property] = {};
				}
				previous = reference;
				reference = reference[property];
			}
		}
	});
	return JSON.stringify(resultObject,undefined,4);
}