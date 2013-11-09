function ElasticClient(host,username,password) {
	this.host = host;
	this.username = username;
	this.password = password;
	
	this.createIndex=function(name, settings, callback_success, callback_error) {
		this.syncRequest('POST', "/" + name, settings, callback_success, callback_error);
	}

	this.enableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":false }};
		this.syncRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	}

	this.disableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":true }};
		this.syncRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	}

	this.getClusterState=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_cluster/state",{}, callback_success, callback_error);
	}

	this.shutdownNode=function(node_id, callback_success, callback_error) {
		this.syncRequest('POST', "/_cluster/nodes/" + node_id + "/_shutdown", {}, callback_success, callback_error);
	}

	this.openIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_open", {}, callback_success, callback_error);
	}

	this.optimizeIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_optimize", {}, callback_success, callback_error);
	}

	this.clearCache=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_cache/clear", {}, callback_success, callback_error);
	}

	this.closeIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_close", {}, callback_success, callback_error);
	}

	this.refreshIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_refresh", {}, callback_success, callback_error);
	}

	this.deleteIndex=function(name, callback_success, callback_error) {
		this.syncRequest('DELETE', "/" + name, {}, callback_success, callback_error);
	}

	this.updateIndexSettings=function(name, settings, callback_success, callback_error) {
		this.syncRequest('PUT', "/" + name + "/_settings", settings, callback_success, callback_error);
	}

	this.updateClusterSettings=function(settings, callback_success, callback_error) {
		this.syncRequest('PUT', "/_cluster/settings", settings, callback_success, callback_error);
	}

	this.getNodes=function(callback_success, callback_error) {
		var nodes = [];
		var createNodes = function(response) {
			Object.keys(response.response['nodes']).forEach(function(node_id) {
				nodes.push(new Node(node_id,response.response['nodes'][node_id]));
			});
			callback_success(nodes);
		}
		this.syncRequest('GET', "/_cluster/state", {}, createNodes, callback_error);
	}

	this.fetchAliases=function(callback_success, callback_error) {
		var createAliases=function(response) {
			callback_success(new Aliases(response));
		}
		this.syncRequest('GET', "/_aliases",{},createAliases, callback_error);
	}

	this.analyzeByField=function(index, type, field, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response['tokens'].map(function (token) {
				return new Token(token['token'],token['start_offset'],token['end_offset'],token['position']);
			});
			callback_success(tokens);	
		}
		this.syncRequest('GET', "/" + index + "/_analyze?field=" + type +"."+field,{'text':text}, buildTokens, callback_error);
	}

	this.analyzeByAnalyzer=function(index, analyzer, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response['tokens'].map(function (token) {
				return new Token(token['token'],token['start_offset'],token['end_offset'],token['position']);
			});
			callback_success(tokens);	
		}
		this.syncRequest('GET', "/" + index + "/_analyze?analyzer=" + analyzer,{'text':text}, buildTokens, callback_error);
	}

	this.updateAliases=function(add_aliases,remove_aliases, callback_success, callback_error) {
		var data = {};
		if (add_aliases.length == 0 && remove_aliases.length == 0) {
			throw "No changes were made: nothing to save";
		}
		data['actions'] = [];
		remove_aliases.forEach(function(alias) {
			data['actions'].push({'remove':alias.info()});
		});
		add_aliases.forEach(function(alias) {
			data['actions'].push({'add':alias.info()});
		});
		this.syncRequest('POST', "/_aliases",JSON.stringify(data, undefined, ""), callback_success, callback_error);
		
	}

	this.getNodesStats=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_nodes/stats?all=true",{},callback_success, callback_error);
	}
	
	this.fetchPercolateQueries=function(index, body, callback_success, callback_error) {
		var path = isDefined(index) ? "/_percolator/" + index + "/_search" : "/_percolator/_search";
		this.syncRequest('POST', path , body,callback_success, callback_error);
	}
	
	this.deletePercolatorQuery=function(index, id, callback_success, callback_error) {
		this.syncRequest('DELETE', "/_percolator/" + index + "/" + id, {}, callback_success, callback_error);
	}
	
	this.createPercolatorQuery=function(index, id, body, callback_success, callback_error) {
		this.syncRequest('PUT', "/_percolator/" + index + "/" + id, body, callback_success, callback_error);
	}
	
	this.syncRequest=function(method, path, data, callback_success, callback_error) {
		var url = this.host + path;
		this.executeRequest(method,url,this.username,this.password, data, callback_success, callback_error);
	}
	
	this.createAuthToken=function(username,password) {
		var auth = null;
		if (username != null && password != null) {
			auth = "Basic " + window.btoa(username + ":" + password);
		}
		return auth;
	}
	
	this.executeRequest=function(method, url, username, password, data, callback_success, callback_error) {
		var auth = this.createAuthToken(username,password);
		var dataType = method == 'GET' ? 'jsonp' : 'json';
		$.when(
			$.ajax({
				type: method,
				url: url,
				dataType: dataType,
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				},
				data: data
		})).then(
			function(r) { 
				callback_success(r); 
			},
			function(error) {
				callback_error(error); 
			}
		 );
	}

	/** ####### END OF REFACTORED AREA ####### **/

	this.getClusterHealth=function(callback_success, callback_error) {
		var url = this.host + "/_cluster/health";
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET',
				url: url,
				dataType: 'jsonp',
				data: {},
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				},
			})).then(
				function(cluster_health) {
					callback_success(new ClusterHealth(cluster_health));
				},
				function(cluster_health) {
					callback_error(cluster_health);
				}
		);
	}

	this.getClusterDetail=function(callback_success, callback_error) {
		var host = this.host;
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/state", 
				dataType: 'jsonp', 
				data: {},
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/nodes/stats?all=true", 
				dataType: 'jsonp', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_status", 
				dataType: 'jsonp', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					}
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/settings", 
				dataType: 'jsonp', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			})
		).done(
			function(cluster_state,nodes_stats,cluster_status,settings) {
				callback_success(new Cluster(cluster_state[0],cluster_status[0],nodes_stats[0],settings[0]));
			},
			function(error) {
				callback_error(error);
			}
		);
	} 

	this.getClusterDiagnosis=function(callback_success,callback_error) {
		var host = this.host;
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/state", 
				dataType: 'jsonp', 
				data: {},
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/nodes/stats?all=true", 
				dataType: 'jsonp', 
				data: {},
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_nodes/hot_threads", 
				data: {},
				beforeSend: function(xhr) { 
					if (auth != null) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			})
		).then(
				function(state, stats, hot_threads) {
					callback_success(state[0], stats[0], hot_threads[0]);
				},
				function(failed_request) {
					callback_error(failed_request);
				}
			);
	}
}

/** TYPES **/
function Token(token, start_offset, end_offset, position) {
	this.token = token;
	this.start_offset = start_offset;
	this.end_offset = end_offset;
	this.position = position;
}

function ClusterHealth(health) {
	this.status = health['status'];
	this.name = health['cluster_name'];
}

function Aliases(aliases_info) {
	var indices  = [];
	var aliases_map = {};
	Object.keys(aliases_info).forEach(function(index) {
		indices.push(index); // fills list of available indices
		var indexAliases = aliases_info[index]['aliases'];
		Object.keys(indexAliases).forEach(function(alias) { // group aliases per alias name
			if (!isDefined(aliases_map[alias])) {
				aliases_map[alias] = [];
			}
			var alias_instance = new Alias(alias, index, indexAliases[alias]['filter'], indexAliases[alias]['index_routing'],indexAliases[alias]['search_routing']);
			aliases_map[alias].push(alias_instance);
		});
	});
	this.indices = indices;
	this.info = aliases_map;
}

function Alias(alias, index, filter, index_routing, search_routing) {
	this.alias = alias != null ? alias.toLowerCase() : "";
	this.index = index != null ? index.toLowerCase() : "";
	this.filter = filter;
	this.index_routing = index_routing;
	this.search_routing = search_routing;

	this.validate=function() {
		if (this.alias == null || this.alias.trim().length == 0) {
			throw "Alias must have a non empty name";
		}
		if (this.index == null || this.index.trim().length == 0) {
			throw "Alias must have a valid index name";
		}
	}

	this.equals=function(other_alias) {
		var equal = 
		(this.alias === other_alias.alias) &&
		(this.index === other_alias.index) &&
		(this.filter === other_alias.filter) &&
		(this.index_routing === other_alias.index_routing) &&
		(this.search_routing === other_alias.search_routing);
		return equal;
	}

	this.info=function() {
		var info = {};
		info['index'] = this.index;
		info['alias'] = this.alias;
	
		if (this.filter != null) {
			if (typeof this.filter == 'string') {
				info['filter'] = JSON.parse(this.filter);
			} else {
				info['filter'] = this.filter;
			}
		}
		if (this.index_routing != null && this.index_routing.trim().length > 0) {
			info['index_routing'] = this.index_routing;
		}
		if (this.search_routing != null && this.search_routing.trim().length > 0) {
			info['search_routing'] = this.search_routing;
		}
		return info; 
	}
}

function Node(node_id, node_info, node_stats) {
	this.id = node_id;	
	this.name = node_info['name'];
	this.metadata = {};
	this.metadata['info'] = node_info;
	this.metadata['stats'] = node_stats;
	this.transport_address = node_info['transport_address'];
	var master = node_info['attributes']['master'] === 'false' ? false : true;
	var data = node_info['attributes']['data'] === 'false' ? false : true;
	var client = node_info['attributes']['client'] === 'true' ? true : false;
	this.master =  master && !client;
	this.data = data && !client;
	this.client = client || !master && !data;
	this.current_master = false;
	this.stats = node_stats;

	this.setCurrentMaster=function() {
		this.current_master = true;
	}
	
	this.compare=function(other) { // TODO: take into account node specs?
		if (other.current_master) {
			return 1;
		}
		if (this.current_master) {
			return -1;
		}
		if (other.master && !this.master) {
			return 1;
		} 
		if (this.master && !other.master) {
			return -1;
		}

		if (other.data && !this.data) {
			return 1;
		} 
		if (this.data && !other.data) {
			return -1;
		}
		return this.name.localeCompare(other.name);
	}
}

function Shard(shard_info) {
	this.info = shard_info;
	this.primary = shard_info.routing.primary;
	this.shard = shard_info.routing.shard;
	this.state = shard_info.routing.state;
	this.node = shard_info.routing.node;
	this.index = shard_info.routing.index;
	this.id = this.node + "_" + this.shard + "_" + this.index;
}

function Cluster(state,status,nodes,settings) {
	if (state != null && status != null && nodes != null && settings != null) {
		this.disableAllocation = false;
		if (isDefined(settings['persistent']) && isDefined(settings['persistent']['disable_allocation'])) {
			this.disableAllocation = settings['persistent']['disable_allocation'] == "true" ? true : false;
		}
		if (isDefined(settings['transient']) && isDefined(settings['transient']['cluster.routing.allocation.disable_allocation'])) {
			this.disableAllocation = settings['transient']['cluster.routing.allocation.disable_allocation'] == "true" ? true : false;
		}
		this.settings = $.extend({}, settings['persistent'], settings['transient']);
		this.master_node = state['master_node'];
		var num_nodes = 0;
		this.nodes = Object.keys(state['nodes']).map(function(x) { 
			var node = new Node(x,state['nodes'][x],nodes['nodes'][x]);
			num_nodes += 1;
			if (node.id === state['master_node']) {
				node.setCurrentMaster();
			}
			return node;
		}).sort(function(a,b) { return a.compare(b) });
    	this.number_of_nodes = num_nodes;
		var iMetadata = state['metadata']['indices'];
		var iRoutingTable = state['routing_table']['indices'];
		var iStatus = status['indices'];
		var count = 0;
		var unassigned_shards = 0;
		var total_size = 0;
		var num_docs = 0;
		this.indices = Object.keys(iMetadata).map(
			function(x) { 
				var index = new Index(x,iRoutingTable[x], iMetadata[x], iStatus[x]);
				unassigned_shards += index.unassigned.length;
				total_size += parseInt(index.total_size);
				num_docs += index.num_docs;
				return index;
			 }
		).sort(function(a,b) { return a.compare(b) });
		this.num_docs = num_docs;
		this.unassigned_shards = unassigned_shards;
		this.total_indices = this.indices.length;
		this.shards = status['_shards']['total'];
		this.failed_shards = status['_shards']['failed'];
		this.successful_shards = status['_shards']['successful'];
		this.total_size = total_size;
		this.getNodes=function(data, master, client) { 
			return $.map(this.nodes,function(n) { 
				return (data && n.data || master && n.master || client && n.client) ? n : null;
			});
		};
	}
}

function Index(index_name,index_info, index_metadata, index_status) {
	this.name = index_name;
	var index_shards = {};
	this.shards = index_shards;
	this.state = index_metadata['state'];
	this.metadata = {};
	this.aliases = index_metadata['aliases'];
	this.total_aliases = isDefined(index_metadata['aliases']) ? index_metadata['aliases'].length : 0;
	this.visibleAliases=function() {
		return this.total_aliases > 5 ? this.aliases.slice(0,5) : this.aliases;
	}
	this.settings = index_metadata['settings'];
	this.mappings = index_metadata['mappings'];
	this.metadata['settings'] = this.settings;
	this.metadata['mappings'] = this.mappings;
	this.num_of_shards = index_metadata['settings']['index.number_of_shards'];
	this.num_of_replicas = parseInt(index_metadata['settings']['index.number_of_replicas']);
	this.state_class = index_metadata['state'] === "open" ? "success" : "active";
	this.visible = true;
	var unassigned = [];

	// adds shard information
	if (typeof index_status != 'undefined') {
		$.map(index_status.shards, function(shards, shard_num) {
			$.map(shards, function(shard_info, shard_copy) {
				if (typeof index_shards[shard_info.routing.node] === 'undefined') {
					index_shards[shard_info.routing.node] = [];
				}
				index_shards[shard_info.routing.node].push(new Shard(shard_info));
			});
		});
		this.metadata['stats'] = index_status
	}
	// adds unassigned shards information
	if (index_info) {
  		Object.keys(index_info['shards']).forEach(function(x) { 
  			var shards_info = index_info['shards'][x];
			shards_info.forEach(function(shard_info) {
				if (shard_info['state'] === 'UNASSIGNED') {
					unassigned.push(shard_info['shard']);	
				}
			});
  		});
	}


	this.unassigned = unassigned;
	var has_status = this.state === 'open' && (typeof index_status != 'undefined')
	this.num_docs = has_status ? index_status['docs']['num_docs'] : 0;
	this.max_doc = has_status ? index_status['docs']['max_doc'] : 0;
	this.deleted_docs = has_status ? index_status['docs']['deleted_docs'] : 0;
	this.size = has_status ? index_status['index']['primary_size_in_bytes'] : 0;
	this.total_size = has_status ? index_status['index']['size_in_bytes'] : 0;
	this.settingsAsString=function() {
		return hierachyJson(JSON.stringify(this.settings, undefined, ""));
	}
	this.compare=function(b) { // TODO: take into account index properties?
		return this.name.localeCompare(b.name);
	}
}

function ClusterState(cluster_state) {
	var start = new Date().getTime();
	
	this.getIndices=function() {
		return Object.keys(this.indices);
	}
	
	this.getTypes=function(index) {
		if (typeof this.indices[index] != 'undefined') {
			return Object.keys(this.indices[index]['types']);
		}
	}
	
	this.getAnalyzers=function(index) {
		if (typeof this.indices[index] != 'undefined') {
			return this.indices[index]['analyzers'];
		}
	}
	
	this.getFields=function(index, type) {
		if (typeof this.indices[index] != 'undefined') {
			return this.indices[index]['types'][type];
		}
	} 
	
	var indices = {};
	
	Object.keys(cluster_state['metadata']['indices']).forEach(function(index) {
		indices[index] = {};
		var indexData = cluster_state['metadata']['indices'][index]['mappings'];
		indices[index]['types'] = {};
		Object.keys(indexData).forEach(function(type) {
			indices[index]['types'][type] = [];
			Object.keys(indexData[type]['properties']).forEach(function(property) {
				indices[index]['types'][type].push(property);
			});
		});
		var indexSettings = cluster_state['metadata']['indices'][index]['settings'];
		indices[index]['analyzers'] = [];
		Object.keys(indexSettings).forEach(function(setting) {
			if (setting.indexOf('index.analysis.analyzer') == 0) {
				var analyzer = setting.substring('index.analysis.analyzer.'.length);
				analyzer = analyzer.substring(0,analyzer.indexOf("."));
				if ($.inArray(analyzer, indices[index]['analyzers']) == -1) {
					indices[index]['analyzers'].push(analyzer);
				}
			}
		});
	});
	
	this.indices = indices;
}
var jsonTree = new JSONTree();

function Request(url, method, body) {
	this.url = url;
	this.method = method;
	this.body = body;
	
	this.clear=function() {
		this.url = '';
		this.method = '';
		this.body = '';
	}
}

var Alert=function(message, response) {
	this.message = message;
	this.response = response;

}

Alert.prototype = {
	getResponse:function() {
		if (this.response != null) {
			return JSON.stringify(this.response, undefined, 2);			
		}
	},
	hasServerResponse:function() {
		return this.response != null;
	},
	clear:function() {
		this.level = null;
		this.message = null;
	}
};

var SuccessAlert=function(message, response) {
	this.message = message;
	this.level = "success";
	this.response = response;
}
SuccessAlert.prototype = new Alert();
SuccessAlert.prototype.constructor = SuccessAlert;

var ErrorAlert=function(message, response) {
	this.message = message;
	this.level = "error";
	this.response = response;
}
ErrorAlert.prototype = new Alert();
ErrorAlert.prototype.constructor = ErrorAlert;

var InfoAlert=function(message, response) {
	this.message = message;
	this.level = "info";
	this.response = response;
}
InfoAlert.prototype = new Alert();
InfoAlert.prototype.constructor = InfoAlert;

function AliasesPagination(page, results) {
	this.page = page;
	this.page_size = 10;
	this.results = results;
	this.alias_query = "";
	this.index_query = "";
	this.past_alias_query = null;
	this.past_index_query = null;
	this.total = 0;
	this.cached_results = null;
	
	this.firstResult=function() {
		if (Object.keys(this.getResults()).length > 0) {
			return ((this.current_page() - 1) * this.page_size) + 1;
		} else {
			return 0;
		}
	}
	
	this.lastResult=function() {
		if (this.current_page() * this.page_size > Object.keys(this.getResults()).length) {
			return Object.keys(this.getResults()).length;
		} else {
			return this.current_page() * this.page_size;
		}
	}

	this.hasNextPage=function() {
		return this.page_size * this.current_page() < Object.keys(this.getResults()).length;
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
	
	this.current_page=function() {
		if (this.alias_query != this.past_alias_query || this.index_query != this.past_index_query) {
			this.page = 1;
		}
		return this.page;
	}
	
	this.getPage=function() {
		var count = 1;
		var first_result = this.firstResult();
		var last_result = this.lastResult();
		var page = {};
		var results = this.getResults();
		Object.keys(results).forEach(function(alias) {
			if (count < first_result || count > last_result) {
				count += 1;
			} else {
				count += 1;
				page[alias] = results[alias];
			}
		});
		return page;
	}
	
	this.setResults=function(results) {
		this.results = results;
		// forces recalculation of page
		this.cached_results = null; 
	}
	
	this.total=function() {
		return Object.keys(this.getResults()).length;
	}
	
	this.getResults=function() {
		var matchingResults = {};
		var filters_changed = (this.alias_query != this.past_alias_query || this.index_query != this.past_index_query);
		if (filters_changed || this.cached_results == null) { // if filters changed or no cached, calculate
			var alias_query = this.alias_query;
			var index_query = this.index_query;
			var results = this.results;
			Object.keys(results).forEach(function(alias_name) {
				if (isDefined(alias_query) && alias_query.length > 0) {
					if (alias_name.indexOf(alias_query) != -1) {
						if (isDefined(index_query) && index_query.length > 0) {
							results[alias_name].forEach(function(alias) {
								if (alias.index.indexOf(index_query) != -1) {
									matchingResults[alias_name] = results[alias_name];
								}
							});
						} else {
							matchingResults[alias_name] = results[alias_name];
						}
					} 
				} else {
					if (isDefined(index_query) && index_query.length > 0) {
						results[alias_name].forEach(function(alias) {
							if (alias.index.indexOf(index_query) != -1) {
								matchingResults[alias_name] = results[alias_name];
							}
						});
					} else {
						matchingResults[alias_name] = results[alias_name];
					}
				}
			});
			this.cached_results = matchingResults;
			this.past_alias_query = this.alias_query;
			this.past_index_query = this.index_query;
		}
		return this.cached_results;
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
var kopf = angular.module('kopf', []);
kopf.factory('IndexSettingsService', function() {
	return {index: null};
});
function AliasesController($scope, $location, $timeout) {
	$scope.aliases = null;
	$scope.new_index = {};
	$scope.pagination= new AliasesPagination(1, []);

	$scope.addAlias=function() {
		try {
			$scope.new_alias.validate();
			// if alias already exists, check if its already associated with index
			if (isDefined($scope.aliases.info[$scope.new_alias.alias])) { 
				var aliases = $scope.aliases.info[$scope.new_alias.alias];
				$.each(aliases,function(i, alias) {
					if (alias.index === $scope.new_alias.index) {
						throw "Alias is already associated with this index";
					} 
				});
			} else { 
				$scope.aliases.info[$scope.new_alias.alias] = [];
			}
			$scope.aliases.info[$scope.new_alias.alias].push($scope.new_alias);
			$scope.new_alias = new Alias();
			$scope.pagination.setResults($scope.aliases.info);
			$scope.setAlert(null);
		} catch (error) {
			$scope.setAlert(new ErrorAlert(error ,null));
		}
	}
	
	$scope.removeAlias=function(alias) {
		delete $scope.aliases.info[alias];
		$scope.pagination.setResults($scope.aliases.info);
	}
	
	$scope.removeAliasFromIndex=function(index, alias_name) {
		var aliases = $scope.aliases.info[alias_name];
		var removeIndex = null;
		for (var i = 0; i < aliases.length; i++) {
			if (alias_name === aliases[i].alias) {
				removeIndex = i;
			}
		}
		if (removeIndex != null) {
			$scope.aliases.info[alias_name].splice(removeIndex,1);
		}
	}
	
	$scope.mergeAliases=function() {
		var deletes = [];
		var adds = [];
		Object.keys($scope.aliases.info).forEach(function(alias_name) {
			var aliases = $scope.aliases.info[alias_name];
			aliases.forEach(function(alias) {
				// if alias didnt exist, just add it
				if (!isDefined($scope.originalAliases.info[alias_name])) { 
					adds.push(alias);
				} else { 
					var originalAliases = $scope.originalAliases.info[alias_name];
					var addAlias = true;
					for (var i = 0; i < originalAliases.length; i++) {
						if (originalAliases[i].equals(alias)) {
							addAlias = false;
							break;
						}
					}
					if (addAlias) {
						adds.push(alias);
					}
				} 
			});
		});
		Object.keys($scope.originalAliases.info).forEach(function(alias_name) {
			var aliases = $scope.originalAliases.info[alias_name];
			aliases.forEach(function(alias) {
				if (!isDefined($scope.aliases.info[alias.alias])) {
					deletes.push(alias);
				} else {
					var newAliases = $scope.aliases.info[alias_name];
					var removeAlias = true;
					for (var i = 0; i < newAliases.length; i++) {
						if (alias.index === newAliases[i].index && alias.equals(newAliases[i])) {
							removeAlias = false;
							break;
						}
					}
					if (removeAlias) {
						deletes.push(alias);
					}
				}
			});
		});
		$scope.client.updateAliases(adds,deletes, 
			function(response) {
				$scope.loadAliases();
				$scope.setAlert(new SuccessAlert("Aliases were successfully updated",response));
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while updating aliases",error));
			}
		);
	}
	
	$scope.loadAliases=function() {
		$scope.new_alias = new Alias();
		$scope.client.fetchAliases(
			function(aliases) {
				$scope.originalAliases = aliases;
				$scope.aliases = jQuery.extend(true, {}, $scope.originalAliases);
				$scope.pagination.setResults($scope.aliases.info);
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while fetching aliases",error));		
			}
		);
	}
	
	$scope.$on('hostChanged',function() {
		$scope.loadAliases();
	});
	
    $scope.$on('loadAliasesEvent', function() {
		$scope.loadAliases();
    });

}
function AnalysisController($scope, $location, $timeout) {
	$scope.indices = null;

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
			$scope.field_tokens = null;
			$scope.client.analyzeByField($scope.field_index,$scope.field_type,$scope.field_field,$scope.field_text, 
				function(response) {
					$scope.field_tokens = response;
					$scope.clearAlert();
				},
				function(error) {
					$scope.field_tokens = null;
					$scope.setAlert(new ErrorAlert("Error while analyzing text", error));
				}
			);
		}
	}
	
	$scope.analyzeByAnalyzer=function() {
		if ($scope.analyzer_analyzer.length > 0 && $scope.analyzer_text.length > 0) {
			$scope.field_tokens = null;
			$scope.analyzer_tokens = $scope.client.analyzeByAnalyzer($scope.analyzer_index,$scope.analyzer_analyzer,$scope.analyzer_text,
				function(response) {
					$scope.field_tokens = response;
					$scope.clearAlert();
				},
				function(error) {
					$scope.field_tokens = null;
					$scope.setAlert(new ErrorAlert("Error while analyzing text", error));
				}
			);
		}
	}
	
	$scope.getTypes=function() {
		if ($scope.cluster_state != null) {
			return $scope.cluster_state.getTypes($scope.field_index);
		}
	}
	
	$scope.getAnalyzers=function() {
		if ($scope.cluster_state != null) {
			return $scope.cluster_state.getAnalyzers($scope.analyzer_index);
		}
	}

	$scope.getFields=function() {
		if ($scope.cluster_state != null) {
			return $scope.cluster_state.getFields($scope.field_index,$scope.field_type);
		}
	}	
	
	$scope.$on('hostChanged',function() {
		$scope.loadAnalysisData();
	});
	
    $scope.$on('loadAnalysisEvent', function() {
		$scope.loadAnalysisData();
    });
	
	$scope.loadAnalysisData=function() {
		$scope.client.getClusterState(
			function(response) {
				var start = new Date().getTime();
				$scope.cluster_state = new ClusterState(response);
				$scope.indices = $scope.cluster_state.getIndices();
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while reading analyzers information from cluster", error));
			}
		);
	}
}
function ClusterHealthController($scope,$location,$timeout) {
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
		$scope.client.getClusterDiagnosis(
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
				$scope.modal.alert = new ErrorAlert("Error while retrieving cluster health information", failed_request.responseText);
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
				$scope.modal.alert = new SuccessAlert("Cluster health information successfully shared", "Gist available at : " + response.html_url);
			})
			.fail(function(response) {
				$scope.modal.alert = new ErrorAlert("Error while publishing Gist", responseText);
			}
		);
	}
}
function ClusterOverviewController($scope, $location, $timeout, IndexSettingsService) {
	$scope.idxSettingsSrv = IndexSettingsService;
	$scope.pagination= new Pagination(1,"", []);
	$scope.cluster = null;
	
	(function loadClusterState() {
		
		$scope.isCurrentView=function() {
			return ($("#cluster_option").length > 0) ? $scope.isActive('cluster_option') : true;
		}
		
		$scope.updateCluster=function(is_forced_refresh) {
			if ($scope.hasConnection()) {
				var forced_refresh = is_forced_refresh;
				if (!$scope.isInModal()) { // only refreshes if no modal is active
					if ($scope.isCurrentView()) {
						$scope.client.getClusterDetail(function(cluster) {
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
						},
						function(error) {
							// alert?
						}
					);
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
		}
		$timeout(loadClusterState, $scope.getRefresh());	
		$scope.updateCluster(false);
	}());
	
	
	$scope.getNodes=function() {
		if ($scope.cluster != null) {
			return $scope.cluster.getNodes($scope.pagination.data,$scope.pagination.master,$scope.pagination.client);	
		}
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
	
	$scope.prepareCreateIndex=function() {
		$scope.broadcastMessage('prepareCreateIndex',{});
	}
	
	$scope.displayClusterHealth=function() {
		$scope.broadcastMessage('loadClusterHealth',{});
	}
	
	$scope.shutdownNode=function(node_id) {
		var response = $scope.client.shutdownNode(node_id,
			function(response) {
				$scope.setAlert(new SuccessAlert("Node [" + node_id + "] successfully shutdown", response));
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while shutting down node",error));
			}
		);
	}

	$scope.optimizeIndex=function(index){
		var response = $scope.client.optimizeIndex(index, 
			function(response) {
				$scope.setAlert(new SuccessAlert("Index was successfully optimized", response));
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while optimizing index", error));
			}				
		);
	}
	
	$scope.deleteIndex=function(index) {
		var response = $scope.client.deleteIndex(index, 
			function(response) {
				$scope.setAlert(new SuccessAlert("Index was successfully deleted", response));
				$scope.closeModal(true);
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while deleting index", error));
				$scope.closeModal(true);
			}	
		);
	}
	
	$scope.clearCache=function(index) {
		var response = $scope.client.clearCache(index,
			function(response) {
				$scope.setAlert(new SuccessAlert("Index cache was successfully cleared", response));
				$scope.closeModal(false);		
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while clearing index cache", error));
				$scope.closeModal(false);
			}
		);
	}

	$scope.refreshIndex=function(index){
		var response = $scope.client.refreshIndex(index, 
			function(response) {
				$scope.setAlert(new SuccessAlert("Index was successfully refreshed", response));
				$scope.closeModal(false);
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while refreshing index", error));	
				$scope.closeModal(false);
			}
		);
	}
	
	$scope.enableAllocation=function() {
		var response = $scope.client.enableShardAllocation(
			function(response) {
				$scope.setAlert(new SuccessAlert("Shard allocation was successfully enabled", response));
				$scope.forceRefresh();
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while enabling shard allocation", error));	
				$scope.forceRefresh();
			}
		);
	}
	
	$scope.disableAllocation=function(current_state) {
		var response = $scope.client.disableShardAllocation(
			function(response) {
				$scope.setAlert(new SuccessAlert("Shard allocation was successfully disabled", response));
				$scope.forceRefresh();
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while disabling shard allocation", error));	
				$scope.forceRefresh();
			}
		);
	}
	
	$scope.closeIndex=function(index) {
		var response = $scope.client.closeIndex(index, 
			function(response) {
				$scope.setAlert(new SuccessAlert("Index was successfully closed", response));
				$scope.closeModal(true);
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while closing index", error));	
				$scope.closeModal(true);
			}
		);
	}
	
	$scope.openIndex=function(index) {
		var response = $scope.client.openIndex(index,
			function(response) {
				$scope.setAlert(new SuccessAlert("Index was successfully opened", response));
				$scope.closeModal(true);
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while opening index", error));
				$scope.closeModal(true);
			}
		);
	}
	
	$scope.loadIndexSettings=function(index) {
		$('#index_settings_option a').tab('show');
		var indices = $scope.cluster.indices.filter(function(i) {
			return i.name == index;
		});
		$scope.idxSettingsSrv.index = indices[0];
		$('#idx_settings_tabs a:first').tab('show');		
	}
}
function ClusterSettingsController($scope, $location, $timeout) {
	$scope.saveClusterSettings=function() {
			var new_settings = {};
			new_settings['transient'] = $scope.cluster.settings;
			var response = $scope.client.updateClusterSettings(JSON.stringify(new_settings, undefined, ""),
				function(response) {
					$scope.modal.alert = new SuccessAlert("Cluster settings were successfully updated",response);
					$scope.broadcastMessage('forceRefresh', {});
				}, 
				function(error) {
					$scope.modal.alert = new ErrorAlert("Error while updating cluster settings",error);
				}
		);
	}
}
function CreateIndexController($scope, $location, $timeout) {
	$scope.settings = '';
	$scope.shards = '';
	$scope.replicas = '';
	$scope.name = '';
	$scope.editor = ace.edit("index-settings-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");
	
	$scope.updateEditor=function() {
		$scope.editor.setValue($scope.settings,1);
		$scope.editor.gotoLine(0,0,false);
	}
	
    $scope.$on('prepareCreateIndex', function() {
		$scope.prepareCreateIndex();
    });

	$scope.createIndex=function() {
		if ($scope.name.trim().length == 0) {
			$scope.modal.alert = new ErrorAlert("You must specify a valid index name", null);	
		} else {
			var settings = {};
			var editor_content = $scope.editor.getValue();
			if (editor_content.trim().length > 0) {
				try {
					settings = JSON.parse(editor_content);
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
			$scope.client.createIndex($scope.name, JSON.stringify(settings, undefined, ""), 
				function(response) {
					$scope.modal.alert = new SuccessAlert('Index successfully created', response);
					$scope.broadcastMessage('forceRefresh', {});					
				}, function(error) { 
					$scope.modal.alert = new ErrorAlert("Error while creating index", error);
				}
			);
		}
	}
	
	$scope.prepareCreateIndex=function() {
		$scope.settings = "";
		$scope.editor.setValue("{}");
		$scope.shards = '';
		$scope.name = '';
		$scope.replicas = '';
	}
}
function GlobalController($scope, $location, $timeout) {
	$scope.version = "0.2-SNAPSHOT";
	$scope.username = null;
	$scope.password = null;
	
	$scope.setConnected=function(status) {
		$scope.is_connected = status;
	}

	$scope.broadcastMessage=function(message,args) {
		$scope.$broadcast(message,args);
	}
	
	$scope.readParameter=function(name){
	    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
		return (results != null) ? results[1] : null;
	}
	
	$scope.setHost=function(url) {
		var exp = /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
		// expected: "http://user:password@host", "http", "user", "password", "host"]
		var url_parts = exp.exec(url);
		if (url_parts != null) {
			$scope.host = url_parts[1] + "://" + url_parts[4];
			$scope.username = url_parts[2];
			$scope.password = url_parts[3];
		} else {
			$scope.username = null;
			$scope.password = null;
			$scope.host = url;
		}
		$scope.setConnected(false);
		$scope.client = new ElasticClient($scope.host,$scope.username,$scope.password);
		$scope.broadcastMessage('hostChanged',{});
	}
	
	if ($location.host() == "") { // when opening from filesystem
		$scope.setHost("http://localhost:9200");
	} else {
		var location = $scope.readParameter('location');
		if (location != null) {
			$scope.setHost(location);
		} else {
			$scope.setHost($location.protocol() + "://" + $location.host() + ":" + $location.port());			
		}
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
	
	$scope.isActive=function(tab) {
		return $('#' + tab).hasClass('active');
	}
	
	$scope.getHost=function() {
		return $scope.host;
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
	
	$scope.getCurrentTime=function() {
		var d = new Date(); 
		return ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);
	}
}
function NewIndexSettingsController($scope, $location, $timeout, IndexSettingsService) {
	$scope.service = IndexSettingsService;
	
	//index.cache.filter.max_size,index.cache.filter.expire
	var allowed_properties = ['index.number_of_replicas', 'index.auto_expand_replicas', 
	'index.blocks.read_only', 'index.blocks.read', 'index.blocks.write<', 'index.blocks.metadata',
	 'index.refresh_interval', 'index.term_index_interval', 'index.term_index_divisor', 
	 'index.translog.flush_threshold_ops', 'index.translog.flush_threshold_size', 
	 'index.translog.flush_threshold_period', 'index.translog.disable_flush', 
	 'index.routing.allocation.total_shards_per_node', 
	 'index.recovery.initial_shards', 'index.gc_deletes', 'index.ttl.disable_purge'];
	 
	 $scope.back=function() {
		 $('#cluster_option a').tab('show');
	 }

	 $scope.save=function() {
		 var index = $scope.service.index;
		 var new_settings = {};
		 allowed_properties.forEach(function(setting) {
			 if (isDefined(index.settings[setting]) && index.settings[setting].length > 0) {
				 new_settings[setting] = index.settings[setting];
			 }
		 });
		 $scope.client.updateIndexSettings(index.name, JSON.stringify(new_settings, undefined, ""),
			 function(response) {
				 $scope.setAlert(new SuccessAlert("Index settings were successfully updated", response));
				 $scope.broadcastMessage('forceRefresh', {});
			 },
			 function(error) {
				 $scope.setAlert(new ErrorAlert("Error while updating index settings", error));
			 }
		 );
	 }
 }
function NavbarController($scope, $location, $timeout) {
	
	$scope.new_refresh = $scope.getRefresh();
	$scope.cluster_health = null;
	
	(function loadClusterHealth() {
		
		$scope.updateClusterHealth=function() {
			$scope.client.getClusterHealth( 
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
					$scope.alert = new ErrorAlert("Error connecting to [" + $scope.host + "]",error_response);
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

	$scope.selectTab=function(event) {
		$scope.clearAlert();
		if (isDefined(event)) {
			$scope.broadcastMessage(event, {});
		}
	}
}

function RestController($scope, $location, $timeout) {
	$scope.editor = ace.edit("rest-client-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");
	
	$scope.request = new Request($scope.getHost() + "/_search","GET","{}");
	$scope.validation_error = null;
	$scope.history = [];
	$scope.history_request = null;
	
	$scope.updateEditor=function() {
		$scope.editor.setValue($scope.request.body,1);
		$scope.editor.gotoLine(0,0,false);
	}
	
	$scope.formatBody=function() {
		var query = $scope.editor.getValue();
		try {
			if (notEmpty(query)) {
				$scope.validation_error = null;
				var bodyObject = JSON.parse(query);
				var formattedBody = JSON.stringify(bodyObject,undefined,4);
				$scope.editor.setValue(formattedBody,0);
				$scope.editor.gotoLine(0,0,false);
				$scope.request.body = formattedBody;
			}
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	}
	
	$scope.loadHistoryRequest=function() {
		$scope.request.url = $scope.history_request.url;
		$scope.request.body = $scope.history_request.body;
		$scope.request.method = $scope.history_request.method;
		$scope.updateEditor();
		$scope.history_request = null;
	}
	
	$scope.sendRequest=function() {
		$scope.formatBody();
		$scope.clearAlert();
		$('#rest-client-response').html('');
		if ($scope.validation_error == null && notEmpty($scope.request.url)) {
			try {
				// TODO: deal with basic auth here
				$scope.client.executeRequest($scope.request.method,$scope.request.url,null,null,$scope.request.body,
					function(response) {
						var content = jsonTree.create(response);
						$('#rest-client-response').html(content);
						$scope.history.push(new Request($scope.request.url,$scope.request.method,$scope.request.body));	
					},
					function(error) {
						try {
							var content = jsonTree.create(JSON.parse(error));
							$('#rest-client-response').html(content);
						} catch (invalid_json) {
							$scope.setAlert(new ErrorAlert("Request did not return a valid JSON", error));
						}
					}
				);
			} catch (error) {
				$scope.setAlert(new ErrorAlert("Error while executing request", error));
			}
		}
	}
	// maybe allow storing queries in ES? would need some kind of security
	$scope.templates = [
		{'key':"search + filter + facets + highlight + sort",'value':JSON.stringify(JSON.parse('{ "query" : { "term" : { "field" : "value" } }, "filter" : { "term" : { "field_name" : "value" } }, "facets" : { "facet_name" : { "terms" : { "field" : "field_name" } } }, "sort" : [ { "field_name" : {"order" : "asc"} } ], "highlight" : { "fields" : { "field_name" : {"fragment_size" : 150, "number_of_fragments" : 3} } }, "from" : 0, "size" : 10 }'), undefined, 4)},
		{'key':"bool query",'value':JSON.stringify(JSON.parse('{"query" : { "bool" : { "must" : { "term" : { "field" : "value" } }, "must_not" : { "term" : { "field" : "value" } }, "should" : [ {"term" : { "field" : "value" }} ], "minimum_should_match" : 1, "boost" : 1.0 } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
		{'key':"ids query",'value':JSON.stringify(JSON.parse('{"query": { "ids" : { "type" : "document_type", "values" : ["1", "2","3"] } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
	];
}
function PercolatorController($scope, $location, $timeout) {
	$scope.editor = ace.edit("percolator-query-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");
		
	$scope.total = 0;
	$scope.queries = [];
	$scope.page = 1;
	$scope.filter = "";
	$scope.id = "";
	
	$scope.index;
	$scope.indices = [];
	$scope.new_query = new PercolateQuery("","","");
	
	
    $scope.$on('loadPercolatorEvent', function() {
		$scope.loadIndices();
		$scope.loadPercolatorQueries();
    });
	
	$scope.previousPage=function() {
		$scope.page -= 1;
		$scope.loadPercolatorQueries();
	}
	
	$scope.nextPage=function() {
		$scope.page += 1;
		$scope.loadPercolatorQueries();
	}
	
	$scope.hasNextPage=function() {
		return $scope.page * 10 < $scope.total;
	}
	
	$scope.hasPreviousPage=function() {
		return $scope.page > 1;
	}
	
	$scope.firstResult=function() {
		return $scope.total > 0 ? ($scope.page - 1) * 10  + 1 : 0;
	}
	
	$scope.lastResult=function() {
		return $scope.hasNextPage() ? $scope.page * 10 : $scope.total;
	}
	
	$scope.formatBody=function() {
		var source = $scope.editor.getValue();
		try {
			if (notEmpty(source)) {
				$scope.validation_error = null;
				var sourceObj = JSON.parse(source);
				var formattedSource = JSON.stringify(sourceObj,undefined,4);
				$scope.editor.setValue(formattedSource,0);
				$scope.editor.gotoLine(0,0,false);
				$scope.new_query.source = formattedSource;
			}
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	}
	
	$scope.parseSearchParams=function() {
		var queries = [];
		if ($scope.id.trim().length > 0) {
			queries.push({"term":{"_id":$scope.id}});
		}
		if ($scope.filter.trim().length > 0) {
			var filter = JSON.parse($scope.filter);
			Object.keys(filter).forEach(function(field) {
				var q = {};
				q[field] = filter[field];
				queries.push({"term": q});
			});
		}
		return queries;
	}
	
	$scope.deletePercolatorQuery=function(type, id) {
		$scope.client.deletePercolatorQuery(type, id,
			function(response) {
				$scope.client.refreshIndex("_percolator", 
					function(response) {
						// non request action, no need to display
						$scope.setAlert(new SuccessAlert("Query successfully deleted", response));
						$scope.loadPercolatorQueries();
					},
					function(error) {
						$scope.setAlert(new SuccessAlert("Error while reloading queries", error));
					}
				);
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while deleting query", error));
			}
		);
	}
	
	$scope.createNewQuery=function() {
		$scope.formatBody();
		$scope.clearAlert();
		if ($scope.validation_error == null) {
			$scope.client.createPercolatorQuery($scope.new_query.index, $scope.new_query.id, $scope.new_query.source,
				function(response) {
					$scope.client.refreshIndex("_percolator", 
						function(response) {
							// non request action, no need to display
							$scope.setAlert(new SuccessAlert("Percolator Query successfully created", response));
							$scope.loadPercolatorQueries();
						},
						function(error) {
							$scope.setAlert(new SuccessAlert("Error while reloading queries", error));
						}
					);
				},
				function(error) {
					$scope.setAlert(new ErrorAlert("Error while creating percolator query", error));
				}
			);
		}
	}
	
	$scope.loadPercolatorQueries=function() {
		var params = {};
		try {
			var queries = $scope.parseSearchParams();
			if (queries.length > 0) {
				params['query'] = {"bool": {"must": queries}};
			}
			params['from'] = (($scope.page - 1) * 10);
			$scope.client.fetchPercolateQueries($scope.index, JSON.stringify(params),
				function(response) {
					$scope.total = response['hits']['total'];
					$scope.queries = response['hits']['hits'].map(function(q) { return new PercolateQuery(q); });
				},
				function(error) {
					if (!(error['responseJSON'] != null && error['responseJSON']['error'] == "IndexMissingException[[_percolator] missing]")) {
						$scope.setAlert(new ErrorAlert("Error while reading loading percolate queries", error));	
					}
				}
			);
		} catch (error) {
			$scope.setAlert(new ErrorAlert("Filter is not a valid JSON"));
			return;
		}
	}
	
	$scope.loadIndices=function() {
		$scope.client.getClusterState(
			function(response) {
				$scope.indices = new ClusterState(response).getIndices().filter(function(index) { return index != '_percolator' });
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while reading loading cluster state", error));
			}
		);
	}
}

function PercolateQuery(query_info) {
	this.type = query_info['_type'];
	this.id = query_info['_id'];
	this.source = query_info['_source'];
	
	this.sourceAsJSON=function() {
		try {
			return JSON.stringify(this.source,undefined, 2);
		} catch (error) {

		}
	}
}