function Alias(alias, index, filter, index_routing, search_routing) {
	this.alias = isDefined(alias) ? alias.toLowerCase() : "";
	this.index = isDefined(index) ? index.toLowerCase() : "";
	this.filter = filter;
	this.index_routing = index_routing;
	this.search_routing = search_routing;

	this.validate=function() {
		if (!notEmpty(this.alias)) {
			throw "Alias must have a non empty name";
		}
		if (!notEmpty(this.index)) {
			throw "Alias must have a valid index name";
		}
	};

	this.equals=function(other_alias) {
		var equal = 
		(this.alias === other_alias.alias) &&
		(this.index === other_alias.index) &&
		(this.filter === other_alias.filter) &&
		(this.index_routing === other_alias.index_routing) &&
		(this.search_routing === other_alias.search_routing);
		return equal;
	};

	this.info=function() {
		var info = {};
		info.index = this.index;
		info.alias = this.alias;
	
		if (isDefined(this.filter)) {
			if (typeof this.filter == 'string' && notEmpty(this.filter)) {
				info.filter = JSON.parse(this.filter);
			} else {
				info.filter = this.filter;
			}
		}
		if (notEmpty(this.index_routing)) {
			info.index_routing = this.index_routing;
		}
		if (notEmpty(this.search_routing)) {
			info.search_routing = this.search_routing;
		}
		return info; 
	};
}
function Aliases(aliases_info) {
	var indices  = [];
	var aliases_map = {};
	Object.keys(aliases_info).forEach(function(index) {
		indices.push(index); // fills list of available indices
		var indexAliases = aliases_info[index].aliases;
		Object.keys(indexAliases).forEach(function(alias) { // group aliases per alias name
			if (!isDefined(aliases_map[alias])) {
				aliases_map[alias] = [];
			}
			var alias_instance = new Alias(alias, index, indexAliases[alias].filter, indexAliases[alias].index_routing,indexAliases[alias].search_routing);
			aliases_map[alias].push(alias_instance);
		});
	});
	this.indices = indices.sort(function(a,b) { return a.localeCompare(b); });
	this.info = aliases_map;
}

function ClusterChanges() {

	this.nodeJoins = null;
	this.nodeLeaves = null;

	this.hasChanges=function() {
		return (isDefined(this.nodeJoins) ||
			isDefined(this.nodeLeaves)
		);
	};

	this.addJoiningNode=function(node) {
		this.changes = true;
		if (!isDefined(this.nodeJoins)) {
			this.nodeJoins = [];
		}
		this.nodeJoins.push(node);
	};

	this.addLeavingNode=function(node) {
		this.changes = true;
		if (!isDefined(this.nodeLeaves)) {
			this.nodeLeaves = [];
		}
		this.nodeLeaves.push(node);
	};

	this.hasJoins=function() {
		return isDefined(this.nodeJoins);
	};

	this.hasLeaves=function() {
		return isDefined(this.nodeLeaves);
	};

}
function ClusterHealth(health) {
	this.status = health.status;
	this.name = health.cluster_name;
}
function Cluster(state,status,nodes,settings) {
	if (isDefined(state) && isDefined(status) && isDefined(nodes) && isDefined(settings)) {
		this.disableAllocation = false;
		if (isDefined(settings.persistent) && isDefined(settings.persistent.disable_allocation)) {
			this.disableAllocation = settings.persistent.disable_allocation == "true" ? true : false;
		}
		if (isDefined(settings.transient) && isDefined(settings.transient['cluster.routing.allocation.disable_allocation'])) {
			this.disableAllocation = settings.transient['cluster.routing.allocation.disable_allocation'] == "true" ? true : false;
		}
		this.settings = $.extend({}, settings.persistent, settings.transient);
		this.master_node = state.master_node;
		var num_nodes = 0;
		this.nodes = Object.keys(state.nodes).map(function(x) { 
			var node = new Node(x,state.nodes[x],nodes.nodes[x]);
			num_nodes += 1;
			if (node.id === state.master_node) {
				node.setCurrentMaster();
			}
			return node;
		}).sort(function(a,b) { return a.compare(b); });
		this.number_of_nodes = num_nodes;
		var iMetadata = state.metadata.indices;
		var iRoutingTable = state.routing_table.indices;
		var iStatus = status.indices;
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
		).sort(function(a,b) { return a.compare(b); });
		this.num_docs = num_docs;
		this.unassigned_shards = unassigned_shards;
		this.total_indices = this.indices.length;
		this.shards = status._shards.total;
		this.failed_shards = status._shards.failed;
		this.successful_shards = status._shards.successful;
		this.total_size = total_size;
		this.getNodes=function(name, data, master, client) { 
			return $.map(this.nodes,function(n) {
				if (name.trim().length > 0 && n.name.toLowerCase().indexOf(name.trim().toLowerCase()) == -1) {
					return null;
				} 
				return (data && n.data || master && n.master || client && n.client) ? n : null;
			});
		};

		this.getChanges=function(new_cluster) {
			var nodes = this.nodes;
			var changes = new ClusterChanges();
			if (isDefined(new_cluster)) {
				nodes.forEach(function(node) {
					for (var i = 0; i < new_cluster.nodes.length; i++) {
						if (new_cluster.nodes[i].equals(node)) {
							node = null;
							break;
						}
					}
					if (isDefined(node)) {
						changes.addLeavingNode(node);
					}
				});
				if (new_cluster.nodes.length != nodes.length || !changes.hasJoins()) {
						new_cluster.nodes.forEach(function(node) {
							for (var i = 0; i < nodes.length; i++) {
								if (nodes[i].equals(node)) {
									node = null;
									break;
								}
							}	
						if (isDefined(node)) {
							changes.addJoiningNode(node);	
						}
					});
				}
			}
			return changes;
		};
	}
}
function ElasticClient(host,username,password) {
	this.host = host;
	this.username = username;
	this.password = password;
	
	this.createIndex=function(name, settings, callback_success, callback_error) {
		this.syncRequest('POST', "/" + name, settings, callback_success, callback_error);
	};

	this.enableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":false }};
		this.syncRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	};

	this.disableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":true }};
		this.syncRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	};

	this.getClusterState=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_cluster/state",{}, callback_success, callback_error);
	};

	this.shutdownNode=function(node_id, callback_success, callback_error) {
		this.syncRequest('POST', "/_cluster/nodes/" + node_id + "/_shutdown", {}, callback_success, callback_error);
	};

	this.openIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_open", {}, callback_success, callback_error);
	};

	this.optimizeIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_optimize", {}, callback_success, callback_error);
	};

	this.clearCache=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_cache/clear", {}, callback_success, callback_error);
	};

	this.closeIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_close", {}, callback_success, callback_error);
	};

	this.refreshIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_refresh", {}, callback_success, callback_error);
	};

	this.deleteIndex=function(name, callback_success, callback_error) {
		this.syncRequest('DELETE', "/" + name, {}, callback_success, callback_error);
	};

	this.updateIndexSettings=function(name, settings, callback_success, callback_error) {
		this.syncRequest('PUT', "/" + name + "/_settings", settings, callback_success, callback_error);
	};

	this.updateClusterSettings=function(settings, callback_success, callback_error) {
		this.syncRequest('PUT', "/_cluster/settings", settings, callback_success, callback_error);
	};

	this.getNodes=function(callback_success, callback_error) {
		var nodes = [];
		var createNodes = function(response) {
			Object.keys(response.response.nodes).forEach(function(node_id) {
				nodes.push(new Node(node_id,response.response.nodes[node_id]));
			});
			callback_success(nodes);
		};
		this.syncRequest('GET', "/_cluster/state", {}, createNodes, callback_error);
	};

	this.fetchAliases=function(callback_success, callback_error) {
		var createAliases=function(response) {
			callback_success(new Aliases(response));
		};
		this.syncRequest('GET', "/_aliases",{},createAliases, callback_error);
	};

	this.analyzeByField=function(index, type, field, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response.tokens.map(function (token) {
				return new Token(token.token,token.start_offset,token.end_offset,token.position);
			});
			callback_success(tokens);	
		};
		this.syncRequest('GET', "/" + index + "/_analyze?field=" + type +"."+field,{'text':text}, buildTokens, callback_error);
	};

	this.analyzeByAnalyzer=function(index, analyzer, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response.tokens.map(function (token) {
				return new Token(token.token,token.start_offset,token.end_offset,token.position);
			});
			callback_success(tokens);	
		};
		this.syncRequest('GET', "/" + index + "/_analyze?analyzer=" + analyzer,{'text':text}, buildTokens, callback_error);
	};

	this.updateAliases=function(add_aliases,remove_aliases, callback_success, callback_error) {
		var data = {};
		if (add_aliases.length === 0 && remove_aliases.length === 0) {
			throw "No changes were made: nothing to save";
		}
		data.actions = [];
		remove_aliases.forEach(function(alias) {
			data.actions.push({'remove':alias.info()});
		});
		add_aliases.forEach(function(alias) {
			data.actions.push({'add':alias.info()});
		});
		this.syncRequest('POST', "/_aliases",JSON.stringify(data, undefined, ""), callback_success, callback_error);
	};

	this.getNodesStats=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_nodes/stats?all=true",{},callback_success, callback_error);
	};
	
	this.getIndexWarmers=function(index, warmer, callback_success, callback_error) {
		var path = "/" + index + "/_warmer/" + warmer.trim();
		this.syncRequest('GET', path ,{},callback_success, callback_error);
	};
	
	this.deleteWarmupQuery=function(index, warmer, callback_success, callback_error) {
		var path = "/" + index + "/_warmer/" + warmer;
		this.syncRequest('DELETE', path, {},callback_success, callback_error);
	};
	
	this.registerWarmupQuery=function(index, types, warmer_id, source, callback_success, callback_error) {
		var path = "/" + index + "/";
		if (notEmpty(types)) {
			path += types + "/";
		}
		path += "/_warmer/" + warmer_id.trim();
		this.syncRequest('PUT', path ,source,callback_success, callback_error);
	};
	
	this.fetchPercolateQueries=function(index, body, callback_success, callback_error) {
		var path = isDefined(index) ? "/_percolator/" + index + "/_search" : "/_percolator/_search";
		this.syncRequest('POST', path , body,callback_success, callback_error);
	};
	
	this.deletePercolatorQuery=function(index, id, callback_success, callback_error) {
		this.syncRequest('DELETE', "/_percolator/" + index + "/" + id, {}, callback_success, callback_error);
	};
	
	this.createPercolatorQuery=function(index, id, body, callback_success, callback_error) {
		this.syncRequest('PUT', "/_percolator/" + index + "/" + id, body, callback_success, callback_error);
	};
	
	this.syncRequest=function(method, path, data, callback_success, callback_error) {
		var url = this.host + path;
		this.executeRequest(method,url,this.username,this.password, data, callback_success, callback_error);
	};
	
	this.createAuthToken=function(username,password) {
		var auth = null;
		if (isDefined(username) && isDefined(password)) {
			auth = "Basic " + window.btoa(username + ":" + password);
		}
		return auth;
	};
	
	this.executeRequest=function(method, url, username, password, data, callback_success, callback_error) {
		var auth = this.createAuthToken(username,password);
		$.when(
			$.ajax({
				type: method,
				url: url,
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
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
	};

	/** ####### END OF REFACTORED AREA ####### **/

	this.getClusterHealth=function(callback_success, callback_error) {
		var url = this.host + "/_cluster/health";
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET',
				url: url,
				dataType: 'json',
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
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
	};

	this.getClusterDetail=function(callback_success, callback_error) {
		var host = this.host;
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/state", 
				dataType: 'json', 
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_nodes/stats?all=true", 
				dataType: 'json', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_status", 
				dataType: 'json', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					}
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/settings", 
				dataType: 'json', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			})
		).then(
			function(cluster_state,nodes_stats,cluster_status,settings) {
				callback_success(new Cluster(cluster_state[0],cluster_status[0],nodes_stats[0],settings[0]));
			},
			function(error) {
				callback_error(error);
			}
		);
	};

	this.getClusterDiagnosis=function(callback_success,callback_error) {
		var host = this.host;
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/state", 
				dataType: 'json', 
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_nodes/stats?all=true", 
				dataType: 'json', 
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({ 
				type: 'GET', 
				url: host+"/_nodes/hot_threads", 
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
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
	};
}













function Index(index_name,index_info, index_metadata, index_status) {
	this.name = index_name;
	var index_shards = {};
	this.shards = index_shards;
	this.state = index_metadata.state;
	this.metadata = {};
	this.aliases = index_metadata.aliases;
	this.total_aliases = isDefined(index_metadata.aliases) ? index_metadata.aliases.length : 0;
	this.visibleAliases=function() {
		return this.total_aliases > 5 ? this.aliases.slice(0,5) : this.aliases;
	};
	this.settings = index_metadata.settings;
	this.mappings = index_metadata.mappings;
	this.metadata.settings = this.settings;
	this.metadata.mappings = this.mappings;
	this.num_of_shards = index_metadata.settings.index.number_of_shards;
	this.num_of_replicas = parseInt(index_metadata.settings.index.number_of_replicas);
	this.state_class = index_metadata.state === "open" ? "success" : "active";
	this.visible = true;
	var unassigned = [];

	// adds shard information
	if (isDefined(index_status)) {
		$.map(index_status.shards, function(shards, shard_num) {
			$.map(shards, function(shard_info, shard_copy) {
				if (!isDefined(index_shards[shard_info.routing.node])) {
					index_shards[shard_info.routing.node] = [];
				}
				index_shards[shard_info.routing.node].push(new Shard(shard_info));
			});
		});
		this.metadata.stats = index_status;
	}
	// adds unassigned shards information
	if (index_info) {
		Object.keys(index_info.shards).forEach(function(x) { 
			var shards_info = index_info.shards[x];
			shards_info.forEach(function(shard_info) {
				if (shard_info.state === 'UNASSIGNED') {
					unassigned.push(new UnassignedShard(shard_info));	
				}
			});
		});
	}


	this.unassigned = unassigned;
	var has_status = this.state === 'open' && isDefined(index_status);
	this.num_docs = has_status && isDefined(index_status.docs) ? index_status.docs.num_docs : 0;
	this.max_doc = has_status && isDefined(index_status.docs) ? index_status.docs.max_doc : 0;
	this.deleted_docs = has_status && isDefined(index_status.docs) ? index_status.docs.deleted_docs : 0;
	this.size = has_status ? index_status.index.primary_size_in_bytes : 0;
	this.total_size = has_status ? index_status.index.size_in_bytes : 0;
	this.settingsAsString=function() {
		return hierachyJson(JSON.stringify(this.settings, undefined, ""));
	};
	this.compare=function(b) { // TODO: take into account index properties?
		return this.name.localeCompare(b.name);
	};
	
	this.getTypes=function() {
		return Object.keys(this.mappings).sort(function(a, b) { return a.localeCompare(b); });
	};
	
	this.getAnalyzers=function() {
		var analyzers = [];
		Object.keys(this.settings).forEach(function(setting) {
			if (setting.indexOf('index.analysis.analyzer') === 0) {
				var analyzer = setting.substring('index.analysis.analyzer.'.length);
				analyzer = analyzer.substring(0,analyzer.indexOf("."));
				if ($.inArray(analyzer, analyzers) == -1) {
					analyzers.push(analyzer);
				}
			}
		});
		return analyzers.sort(function(a, b) { return a.localeCompare(b); });
	};
	
	this.getFields=function(type) {
		if (isDefined(this.mappings[type])) {
			return Object.keys(this.mappings[type].properties).sort(function(a, b) { return a.localeCompare(b); });
		} else {
			return [];
		}
	};	
}
function Node(node_id, node_info, node_stats) {
	this.id = node_id;	
	this.name = node_info.name;
	this.metadata = {};
	this.metadata.info = node_info;
	this.metadata.stats = node_stats;
	this.transport_address = node_info.transport_address;
	var master = node_info.attributes.master === 'false' ? false : true;
	var data = node_info.attributes.data === 'false' ? false : true;
	var client = node_info.attributes.client === 'true' ? true : false;
	this.master =  master && !client;
	this.data = data && !client;
	this.client = client || !master && !data;
	this.current_master = false;
	this.stats = node_stats;

	this.setCurrentMaster=function() {
		this.current_master = true;
	};

	this.equals=function(node) {
		return node.id === this.id;
	};
	
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
	};
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

function UnassignedShard(shard_info) {
	this.primary = shard_info.primary;
	this.shard = shard_info.shard;
	this.state = shard_info.state;
	this.node = shard_info.node;
	this.index = shard_info.index;
	this.id = this.node + "_" + this.shard + "_" + this.index;
}
/** TYPES **/
function Token(token, start_offset, end_offset, position) {
	this.token = token;
	this.start_offset = start_offset;
	this.end_offset = end_offset;
	this.position = position;
}
function getTimeString(date) {
	date = isDefined(date) ? date : new Date();
	return ('0' + date.getHours()).slice(-2) + ":" + ('0' + date.getMinutes()).slice(-2) + ":" + ('0' + date.getSeconds()).slice(-2);
}

function Request(url, method, body) {
	this.timestamp = getTimeString();
	this.url = url;
	this.method = method;
	this.body = body;
	
	this.clear=function() {
		this.url = '';
		this.method = '';
		this.body = '';
	};
	
	this.loadFromJSON=function(json) {
		this.method = json.method;
		this.url = json.url;
		this.body = json.body;
		this.timestamp = json.timestamp;
		return this;
	};
	
	this.equals=function(request) {
		return (
			this.url === request.url &&
			this.method.toUpperCase() === request.method.toUpperCase() &&
			this.body === request.body
		);
	};
}

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
	};
	
	this.lastResult=function() {
		if (this.current_page() * this.page_size > Object.keys(this.getResults()).length) {
			return Object.keys(this.getResults()).length;
		} else {
			return this.current_page() * this.page_size;
		}
	};

	this.hasNextPage=function() {
		return this.page_size * this.current_page() < Object.keys(this.getResults()).length;
	};
	
	this.hasPreviousPage=function() {
		return this.current_page() > 1;
	};
	
	this.nextPage=function() {
		this.page += 1;
	};
	
	this.previousPage=function() {
		this.page -= 1;
	};
	
	this.current_page=function() {
		if (this.alias_query != this.past_alias_query || this.index_query != this.past_index_query) {
			this.page = 1;
		}
		return this.page;
	};
	
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
	};
	
	this.setResults=function(results) {
		this.results = results;
		// forces recalculation of page
		this.cached_results = null; 
	};
	
	this.total=function() {
		return Object.keys(this.getResults()).length;
	};
	
	this.getResults=function() {
		var matchingResults = {};
		var filters_changed = (this.alias_query != this.past_alias_query || this.index_query != this.past_index_query);
		if (filters_changed || !isDefined(this.cached_results)) { // if filters changed or no cached, calculate
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
	};
}

function ClusterNavigation() {
	this.page = 1;
	this.page_size = 4; // TODO: allow to change it?

	this.query = "";
	this.previous_query = null;
	
	this.data = true;
	this.master = true;
	this.client = true;
	this.state = "";
	this.node_name = "";
}

function ModalControls() {
	this.alert = null;
	this.active = false;
	this.title = '';
	this.info = '';
}

function isDefined(value) {
	return value !== null && typeof value != 'undefined';
}

function notEmpty(value) {
	return isDefined(value) && value.trim().length > 0;
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

// manages behavior of confirmation dialog
kopf.factory('ConfirmDialogService', function() {
	this.header = "Default Header";
	this.body = "Default Body";
	this.cancel_text = "cancel";
	this.confirm_text = "confirm";
	
	this.confirm=function() {
		// when created, does nothing
	};
	
	this.close=function() {
		// when created, does nothing		
	};
	
	this.open=function(header, body, action, confirm_callback, close_callback) {
		this.header = header;
		this.body = body;
		this.action = action;
		this.confirm = confirm_callback;
		this.close = close_callback;
	};
	
	return this;
});

function AliasesController($scope, $location, $timeout, AlertService) {
	$scope.aliases = null;
	$scope.new_index = {};
	$scope.pagination= new AliasesPagination(1, []);
	
	$scope.editor = new AceEditor('alias-filter-editor');
	
	$scope.viewDetails=function(alias) {
		$scope.details = alias;
	};

	$scope.addAlias=function() {
		$scope.new_alias.filter = $scope.editor.format();
		if (!isDefined($scope.editor.error)) {
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
				AlertService.success("Alias successfully added. Note that changes made will only be persisted after saving changes");
			} catch (error) {
				AlertService.error(error ,null);
			}
		} else {
			AlertService.error("Invalid filter defined for alias" , $scope.editor.error);
		}
	};
	
	$scope.removeAlias=function(alias) {
		delete $scope.aliases.info[alias];
		$scope.pagination.setResults($scope.aliases.info);
		AlertService.success("Alias successfully removed. Note that changes made will only be persisted after saving changes");
	};
	
	$scope.removeAliasFromIndex=function(index, alias_name) {
		var aliases = $scope.aliases.info[alias_name];
		for (var i = 0; i < aliases.length; i++) {
			if (alias_name === aliases[i].alias && index === aliases[i].index) {
				$scope.aliases.info[alias_name].splice(i,1);
				AlertService.success("Alias successfully dissociated from index. Note that changes made will only be persisted after saving changes");
			}
		}
	};
	
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
				$scope.updateModel(function() {
					AlertService.success("Aliases were successfully updated",response);
				});
				$scope.loadAliases();
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while updating aliases",error);
				});
			}
		);
	};
	
	$scope.loadAliases=function() {
		$scope.new_alias = new Alias();
		$scope.client.fetchAliases(
			function(aliases) {
				$scope.updateModel(function() {
					$scope.originalAliases = aliases;
					$scope.aliases = jQuery.extend(true, {}, $scope.originalAliases);
					$scope.pagination.setResults($scope.aliases.info);
				});
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while fetching aliases",error);		
				});
			}
		);
	};
	
	$scope.$on('hostChanged',function() {
		$scope.loadAliases();
	});
	
    $scope.$on('loadAliasesEvent', function() {
		$scope.loadAliases();
    });

}
function AnalysisController($scope, $location, $timeout, AlertService) {
	$scope.indices = null;
	$scope.alert_service = AlertService;

	// by index
	$scope.field_index = null;
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
			$scope.client.analyzeByField($scope.field_index.name,$scope.field_type,$scope.field_field,$scope.field_text, 
				function(response) {
					$scope.updateModel(function() {
						$scope.field_tokens = response;
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.field_tokens = null;
						$scope.alert_service.error("Error while analyzing text", error);
					});
				}
			);
		}
	};
	
	$scope.analyzeByAnalyzer=function() {
		if ($scope.analyzer_analyzer.length > 0 && $scope.analyzer_text.length > 0) {
			$scope.field_tokens = null;
			$scope.analyzer_tokens = $scope.client.analyzeByAnalyzer($scope.analyzer_index.name,$scope.analyzer_analyzer,$scope.analyzer_text,
				function(response) {
					$scope.updateModel(function() {
						$scope.field_tokens = response;
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.field_tokens = null;
						$scope.alert_service.error("Error while analyzing text", error);
					});
				}
			);
		}
	};
	
	$scope.$on('hostChanged',function() {
		$scope.indices = $scope.cluster.indices;
	});
	
    $scope.$on('loadAnalysisEvent', function() {
		$scope.indices = $scope.cluster.indices;
    });
	
}
function ClusterHealthController($scope,$location,$timeout, AlertService) {
	$scope.shared_url = '';
	$scope.cluster_health = {};
	$scope.state = '';
	
	
	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};
	
    $scope.$on('loadClusterHealth', function() {
		$('#cluster_health_option a').tab('show');
		$scope.cluster_health = null; // otherwise we see past version, then new
		$scope.state = ''; // informs about loading state
    });
	
	$scope.loadClusterHealth=function() {
		var cluster_health = null;
		$scope.cluster_health = null; // otherwise we see past version, then new
		$scope.state = "loading cluster health state. this could take a few moments...";
		$scope.client.getClusterDiagnosis(
			function(state, stats, hot_threads) {
				cluster_health = {};
				cluster_health.state = JSON.stringify(state, undefined, 4);
				cluster_health.stats = JSON.stringify(stats, undefined, 4);
				cluster_health.hot_threads = hot_threads;
				$scope.updateModel(function() {
					$scope.cluster_health = cluster_health;
					$scope.state = '';
				});
			},
			function(failed_request) {
				$scope.updateModel(function() {
					$scope.state = '';
					AlertService.error("Error while retrieving cluster health information", failed_request.responseText);
				});
		});
	};

	$scope.publishClusterHealth=function() {
		var gist = {};
		gist.description = 'Cluster information delivered by kopf';
		gist.public = true;
		gist.files = {};
		gist.files.state = {'content': $scope.cluster_health.state,'indent':'2', 'language':'JSON'};
		gist.files.stats = {'content': $scope.cluster_health.stats,'indent':'2', 'language':'JSON'} ;
		gist.files.hot_threads = {'content':$scope.cluster_health.hot_threads,'indent':'2', 'language':'JSON'};
		var data = JSON.stringify(gist, undefined, 4);
		$.ajax({ type: 'POST', url: "https://api.github.com/gists", dataType: 'json', data: data})
			.done(function(response) { 
				$scope.updateModel(function() {
					AlertService.success("Cluster health information successfully shared at: " + response.html_url, null, 60000);
				});
			})
			.fail(function(response) {
				$scope.updateModel(function() {
					AlertService.error("Error while publishing Gist", responseText);
				});
			}
		);
	};
}
function ClusterOverviewController($scope, $location, $timeout, IndexSettingsService, ConfirmDialogService, AlertService, SettingsService) {
	$scope.settings_service = SettingsService;
	$scope.idxSettingsSrv = IndexSettingsService;
	$scope.dialog_service = ConfirmDialogService;
	$scope.pagination= new ClusterNavigation();
	$scope.alert_service = AlertService;
	
	$scope.getNodes=function() {
		if (isDefined($scope.cluster)) {
			return $scope.cluster.getNodes($scope.pagination.node_name, $scope.pagination.data,$scope.pagination.master,$scope.pagination.client);	
		}
	};
	
	$scope.closeModal=function(forced_refresh){
		if (forced_refresh) {
			$scope.refreshClusterState();
		}
	};
	
	$scope.shutdown_node=function(node_id, node_name) {
		$scope.dialog_service.open(
			"are you sure you want to shutdown node " + node_name + "?",
			"Shutting down a node will make all data stored in this node inaccessible, unless this data is replicated across other nodes." +
			"Replicated shards will be promoted to primary if the primary shard is no longer reachable.",
			"Shutdown",
			function() {
				var response = $scope.client.shutdownNode(node_id,
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Node [" + node_id + "] successfully shutdown", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while shutting down node",error);
						});
					}
				);
			}
		);
	};

	$scope.optimizeIndex=function(index){
		$scope.dialog_service.open(
			"are you sure you want to optimize index " + index + "?",
			"Optimizing an index is a resource intensive operation and should be done with caution."+
			"Usually, you will only want to optimize an index when it will no longer receive updates",
			"Optimize",
			function() {
				$scope.client.optimizeIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Index was successfully optimized", response);
						});
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while optimizing index", error);
						});
					}				
				);
			}
		);
	};
	
	$scope.deleteIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to delete index " + index + "?",
			"Deleting an index cannot be undone and all data for this index will be lost",
			"Delete",
			function() {
				$scope.client.deleteIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Index was successfully deleted", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting index", error);
						});
					}	
				);
			}
		);
	};
	
	$scope.clearCache=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to clear the cache for index " + index + "?",
			"This will clear all caches for this index.",
			"Clear",
			function() {
				$scope.client.clearCache(index,
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Index cache was successfully cleared", response);
						});
						$scope.refreshClusterState();						
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while clearing index cache", error);
						});
					}
				);
			}
		);
	};

	$scope.refreshIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to refresh index " + index + "?",
			"Refreshing an index makes all operations performed since the last refresh available for search.",
			"Refresh",
			function() {
				$scope.client.refreshIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Index was successfully refreshed", response);
						});
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while refreshing index", error);	
						});
					}
				);
			}
		);
	};
	
	$scope.enableAllocation=function() {
		var response = $scope.client.enableShardAllocation(
			function(response) {
				$scope.updateModel(function() {
					$scope.alert_service.success("Shard allocation was successfully enabled", response);
				});
				$scope.refreshClusterState();
			},
			function(error) {
				$scope.updateModel(function() {
					$scope.alert_service.error("Error while enabling shard allocation", error);	
				});
			}
		);
	};
	
	$scope.disableAllocation=function(current_state) {
		var response = $scope.client.disableShardAllocation(
			function(response) {
				$scope.updateModel(function() {
					$scope.alert_service.success("Shard allocation was successfully disabled", response);
				});
				$scope.refreshClusterState();
			},
			function(error) {
				$scope.updateModel(function() {
					$scope.alert_service.error("Error while disabling shard allocation", error);	
				});
			}
		);
	};
	
	$scope.closeIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to close index " + index + "?",
			"Closing an index will remove all it's allocated shards from the cluster. " +
			"Both searches and updates will no longer be accepted for the index." +
			"A closed index can be reopened at any time",
			"Close index",
			function() {
				$scope.client.closeIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Index was successfully closed", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while closing index", error);	
						});
					}
				);
			}
		);
	};
	
	$scope.openIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to open index " + index + "?",
			"Opening an index will trigger the recovery process for the index. " +
			"This process could take sometime depending on the index size.",
			"Open index",
			function() {
				$scope.client.openIndex(index,
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Index was successfully opened", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while opening index", error);
						});
					}
				);
			}
		);
	};
	
	$scope.loadIndexSettings=function(index) {
		$('#index_settings_option a').tab('show');
		var indices = $scope.cluster.indices.filter(function(i) {
			return i.name == index;
		});
		$scope.idxSettingsSrv.index = indices[0];
		$('#idx_settings_tabs a:first').tab('show');		
	};
	
	
	$scope.firstResult=function() {
		if ($scope.getResults().length > 0) {
			return (($scope.current_page() - 1) * $scope.pagination.page_size) + 1;
		} else {
			return 0;
		}
	};
	
	$scope.lastResult=function() {
		if ($scope.current_page() * $scope.pagination.page_size > $scope.getResults().length) {
			return $scope.getResults().length;
		} else {
			return $scope.current_page() * $scope.pagination.page_size;
		}
	};

	$scope.hasNextPage=function() {
		return $scope.pagination.page_size * $scope.current_page() < $scope.getResults().length;
	};
	
	$scope.hasPreviousPage=function() {
		return $scope.current_page() > 1;
	};
	
	$scope.nextPage=function() {
		$scope.pagination.page += 1;
	};
	
	$scope.previousPage=function() {
		$scope.pagination.page -= 1;
	};
	
	$scope.total=function() {
		return $scope.getResults().length;
	};
	
	$scope.current_page=function() {
		if ($scope.pagination.query != $scope.pagination.previous_query) {
			$scope.pagination.previous_query = $scope.pagination.query;
			$scope.pagination.page = 1;
		}
		return $scope.pagination.page;
	};
	
	$scope.getPage=function() {
		var count = 1;
		var first_result = $scope.firstResult();
		var last_result = $scope.lastResult();
		var page = $.map($scope.getResults(),function(i) {
			if (count < first_result || count > last_result) {
				count += 1;
				return null;
			}
			count += 1;
			return i;
		});
		return page;
	};
	
	$scope.getResults=function() {
		var indices = isDefined($scope.cluster) ? $scope.cluster.indices : [];
		var query = $scope.pagination.query;
		var state = $scope.pagination.state;
		return $.map(indices,function(i) {
			if (isDefined(query) && query.length > 0) {
				if (i.name.toLowerCase().indexOf(query.trim().toLowerCase()) == -1) {
					return null;
				} 
			}
			if (state.length > 0 && state != i.state) {
				return null;
			} 
			return i;
		});
	};
	
}
function ClusterSettingsController($scope, $location, $timeout, AlertService) {
	$scope.alert_service = AlertService;

	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};
	
    $scope.$on('loadClusterSettingsEvent', function() {
		$('#cluster_settings_option a').tab('show');
		$('#cluster_settings_tabs a:first').tab('show');
		$scope.settings = $scope.cluster.settings;
    });

	$scope.save=function() {
			var new_settings = {};
			new_settings.transient = $scope.settings;
			var response = $scope.client.updateClusterSettings(JSON.stringify(new_settings, undefined, ""),
				function(response) {
					$scope.updateModel(function() {
						$scope.alert_service.success("Cluster settings were successfully updated",response);
					});
					$scope.refreshClusterState();
				}, 
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while updating cluster settings",error);
					});
				}
		);
	};
}
function CreateIndexController($scope, $location, $timeout, AlertService) {
	$scope.alert_service = AlertService;
	$scope.settings = '';
	$scope.shards = '';
	$scope.replicas = '';
	$scope.name = '';

	$scope.editor = new AceEditor('index-settings-editor');
	
	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};
	
    $scope.$on('loadCreateIndex', function() {
		$('#create_index_option a').tab('show');
		$scope.prepareCreateIndex();
    });

	$scope.createIndex=function() {
		if ($scope.name.trim().length === 0) {
			AlertService.error("You must specify a valid index name", null);	
		} else {
			var settings = {};
			var content = $scope.editor.getValue();
			if (content.trim().length > 0) {
				try {
					settings = JSON.parse(content);
				} catch (error) {
					throw "Invalid JSON: " + error;
				}
			} 
			if (!isDefined(settings.settings)) {
				settings = {"settings":settings};
			} 
			if (!isDefined(settings.settings.index)) {
				settings.settings.index = {};
			} 
			var index_settings = settings.settings.index;
			if ($scope.shards.trim().length > 0) {
				index_settings.number_of_shards = $scope.shards;
			}
			if ($scope.replicas.trim().length > 0) {
				index_settings.number_of_replicas = $scope.replicas;
			}
			$scope.client.createIndex($scope.name, JSON.stringify(settings, undefined, ""), 
				function(response) {
					$scope.updateModel(function() {
						AlertService.success('Index successfully created', response);
					});
					$scope.refreshClusterState();
				}, function(error) { 
					$scope.updateModel(function() {
						AlertService.error("Error while creating index", error);
					});
				}
			);
		}
	};
	
	$scope.prepareCreateIndex=function() {
		$scope.settings = "";
		$scope.editor.setValue("{}");
		$scope.shards = '';
		$scope.name = '';
		$scope.replicas = '';
	};
}
function GlobalController($scope, $location, $timeout, $sce, ConfirmDialogService, AlertService, SettingsService) {
	$scope.dialog = ConfirmDialogService;
	$scope.version = "1.0.0-SNAPSHOT";
	$scope.username = null;
	$scope.password = null;
	$scope.alerts_service = AlertService;
	
	$scope.setConnected=function(status) {
		$scope.is_connected = status;
	};

	$scope.broadcastMessage=function(message,args) {
		$scope.$broadcast(message,args);
	};
	
	$scope.readParameter=function(name){
		var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
		return isDefined(results) ? results[1] : null;
	};
	
	$scope.setHost=function(url) {
		var exp = /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
		// expected: "http://user:password@host", "http", "user", "password", "host"]
		var url_parts = exp.exec(url);
		if (isDefined(url_parts)) {
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
	};
	
	if ($location.host() === "") { // when opening from filesystem
		$scope.setHost("http://localhost:9200");
	} else {
		var location = $scope.readParameter('location');
		if (isDefined(location)) {
			$scope.setHost(location);
		} else {
			$scope.setHost($location.protocol() + "://" + $location.host() + ":" + $location.port());			
		}
	}
	$scope.modal = new ModalControls();
	$scope.alert = null;
	$scope.is_connected = false;

	$scope.alertClusterChanges=function(cluster) {
		if (isDefined($scope.cluster) && isDefined(cluster)) {
			var changes = $scope.cluster.getChanges(cluster);
			if (changes.hasChanges()) {
				if (changes.hasJoins()) {
					var joins = changes.nodeJoins.map(function(node) { return node.name + "[" + node.transport_address + "]"; });
					AlertService.info(joins.length + " new node(s) joined the cluster", joins);
				}
				if (changes.hasLeaves()) {
					var leaves = changes.nodeLeaves.map(function(node) { return node.name + "[" + node.transport_address + "]"; });
					AlertService.warn(changes.nodeLeaves.length + " node(s) left the cluster", leaves);
				}
			}
		}
	};
		
	$scope.refreshClusterState=function() {
		$timeout(function() { 
			$scope.client.getClusterDetail(
				function(cluster) {
					$scope.updateModel(function() { 
						$scope.alertClusterChanges(cluster);
						$scope.cluster = cluster; 
					});
				},
				function(error) {
					$scope.updateModel(function() { 
						AlertService.error("Error while retrieving cluster information", error);
						$scope.cluster = null; 
					});
				}
			);
			
			$scope.client.getClusterHealth( 
				function(cluster) {
					$scope.updateModel(function() { 
						$scope.cluster_health = cluster;
						$scope.setConnected(true);
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.cluster_health = null;
						$scope.setConnected(false);
						AlertService.error("Error connecting to [" + $scope.host + "]",error);						
					});
				}
			);
		}, 100);	
	};

	$scope.autoRefreshCluster=function() {
		$scope.refreshClusterState();
		$timeout(function() { $scope.autoRefreshCluster(); }, SettingsService.getRefreshInterval());	
	};
	
	$scope.autoRefreshCluster();

	$scope.hasConnection=function() {
		return $scope.is_connected;
	};
	
	$scope.isActive=function(tab) {
		return $('#' + tab).hasClass('active');
	};
	
	$scope.getHost=function() {
		return $scope.host;
	};
	
	$scope.readablizeBytes=function(bytes) {
		if (bytes > 0) {
			var s = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];
			var e = Math.floor(Math.log(bytes) / Math.log(1024));
			return (bytes / Math.pow(1024, e)).toFixed(2) + s[e];	
		} else {
			return 0;
		}
	};

	$scope.displayInfo=function(title,info) {
		$scope.modal.title = title;
		$scope.modal.info = $sce.trustAsHtml(JSONTree.create(info));
		$('#modal_info').modal({show:true,backdrop:true});
	};
	
	$scope.isInModal=function() {
		return ($('.modal-backdrop').length > 0);
	};
	
	$scope.getCurrentTime=function() {
		return getTimeString();
	};
	
	$scope.selectTab=function(event) {
		AlertService.clear();
		if (isDefined(event)) {
			$scope.broadcastMessage(event, {});
		}
	};
	
	$scope.updateModel=function(action) {
		$scope.$apply(action);
	};
	
}
function IndexSettingsController($scope, $location, $timeout, IndexSettingsService, AlertService) {
	$scope.alert_service = AlertService;
	$scope.service = IndexSettingsService;
	
	//index.cache.filter.max_size,index.cache.filter.expire
	var allowed_properties = [
		// INDEX
		'index.number_of_replicas', 
		'index.auto_expand_replicas', 
		'index.refresh_interval',
		'index.index_concurrency',
		'index.warmer.enabled',
		'index.term_index_interval',
		'index.term_index_divisor', 
		'index.recovery.initial_shards',
		'index.gc_deletes',
		'index.ttl.disable_purge',
		'index.fail_on_merge_failure',
		'index.codec',
		'index.compound_format',
		'index.compound_on_flush',
		// BLOCKS
		'index.blocks.read_only',
		'index.blocks.read',
		'index.blocks.write',
		'index.blocks.metadata',
		// TRANSLOG		
		'index.translog.flush_threshold_ops',
		'index.translog.flush_threshold_size', 
		'index.translog.flush_threshold_period',
		'index.translog.disable_flush',
		'index.translog.fs.type',
		// ROUTING
		'index.routing.allocation.disable_allocation',
		'index.routing.allocation.disable_new_allocation',
		'index.routing.allocation.disable_replica_allocation',
		'index.routing.allocation.total_shards_per_node',
		// CACHE
		'index.cache.filter.max_size',
		'index.cache.filter.expire',
		// SLOWLOG
		'index.search.slowlog.threshold.query.warn',
		'index.search.slowlog.threshold.query.info',
		'index.search.slowlog.threshold.query.debug',
		'index.search.slowlog.threshold.query.trace',
		'index.search.slowlog.threshold.fetch.warn',
		'index.search.slowlog.threshold.fetch.info',
		'index.search.slowlog.threshold.fetch.debug',
		'index.search.slowlog.threshold.fetch.trace',
		'index.indexing.slowlog.threshold.index.warn',
		'index.indexing.slowlog.threshold.index.info',
		'index.indexing.slowlog.threshold.index.debug',
		'index.indexing.slowlog.threshold.index.trace'
	];
	 
	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};

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
				$scope.updateModel(function() {
					$scope.alert_service.success("Index settings were successfully updated", response);
				});
				$scope.refreshClusterState();
			},
			function(error) {
				$scope.updateModel(function() {
					$scope.alert_service.error("Error while updating index settings", error);
				});
			}
		);
	};
 }
function NavbarController($scope, $location, $timeout, AlertService, SettingsService) {
	$scope.settings_service = SettingsService;
	$scope.alert_service = AlertService;
	$scope.new_refresh = $scope.settings_service.getRefreshInterval();
	
    $scope.connectToHost=function() {
		if (isDefined($scope.new_host) && $scope.new_host.length > 0) {
			$scope.setHost($scope.new_host);
			$scope.cluster_health = null;
			$scope.refreshClusterState();
		}
	};
	
	$scope.changeRefresh=function() {
		$scope.settings_service.setRefreshInterval($scope.new_refresh);
	};

}

function RestController($scope, $location, $timeout, AlertService) {
	$scope.alert_service = AlertService;
	
	$scope.request = new Request($scope.getHost() + "/_search","GET","{}");
	$scope.validation_error = null;

	$scope.loadHistory=function() {
		var history = [];
		if (isDefined(localStorage.kopf_request_history)) {
			try {
				history = JSON.parse(localStorage.kopf_request_history).map(function(h) {
					return new Request().loadFromJSON(h);
				});
			} catch (error) {
				localStorage.kopf_request_history = null;
			}
		} 
		return history;
	};
	
	$scope.history = $scope.loadHistory();
	$scope.history_request = null;
		
	$scope.editor = new AceEditor('rest-client-editor');
	$scope.editor.setValue($scope.request.body);
	
	$scope.loadFromHistory=function(history_request) {
		$scope.request.url = history_request.url;
		$scope.request.body = history_request.body;
		$scope.request.method = history_request.method;
		$scope.editor.setValue(history_request.body);
		$scope.history_request = null;
	};

	$scope.addToHistory=function(history_request) {
		var exists = false;
		for (var i = 0; i < $scope.history.length; i++) {
			if ($scope.history[i].equals(history_request)) {
				exists = true;
				break;
			}
		}
		if (!exists) {
			$scope.history.unshift(history_request);
			if ($scope.history.length > 30) {
				$scope.history.length = 30;
			}
			localStorage.kopf_request_history = JSON.stringify($scope.history);			
		}
	};

	$scope.sendRequest=function() {
		$scope.request.body = $scope.editor.format();
		$('#rest-client-response').html('');
		if (!isDefined($scope.editor.error) && notEmpty($scope.request.url)) {
			// TODO: deal with basic auth here
			if ($scope.request.method == 'GET' && '{}' !== $scope.request.body) {
				$scope.alert_service.info("You are executing a GET request with body content. Maybe you meant to use POST or PUT?");
			}
			$scope.client.executeRequest($scope.request.method,$scope.request.url,null,null,$scope.request.body,
				function(response) {
					var content = response;
					try {
						content = JSONTree.create(response);
					} catch (parsing_error) {
						// nothing to do
					}
					$('#rest-client-response').html(content);
					$scope.updateModel(function() {
						$scope.addToHistory(new Request($scope.request.url,$scope.request.method,$scope.request.body));
					});

				},
				function(error) {
					$scope.updateModel(function() {
						if (error.status !== 0) {
							$scope.alert_service.error("Request was not successful: " + error.statusText);
						} else {
							$scope.alert_service.error($scope.request.url + " is unreachable");	
						}
					});
					try {
						$('#rest-client-response').html(JSONTree.create(JSON.parse(error.responseText)));
					} catch (invalid_json) {
						$('#rest-client-response').html(error.responseText);
					}
				}
			);
		}
	};
}
function PercolatorController($scope, $location, $timeout, ConfirmDialogService, AlertService) {
	$scope.alert_service = AlertService;
	$scope.dialog_service = ConfirmDialogService;
	
	$scope.editor = new AceEditor('percolator-query-editor');
		
	$scope.total = 0;
	$scope.queries = [];
	$scope.page = 1;
	$scope.filter = "";
	$scope.id = "";
	
	$scope.index = null;
	$scope.indices = [];
	$scope.new_query = new PercolateQuery("","","");
	
	$scope.$on('loadPercolatorEvent', function() {
		$scope.loadIndices();
		$scope.loadPercolatorQueries();
    });
	
	$scope.previousPage=function() {
		$scope.page -= 1;
		$scope.loadPercolatorQueries();
	};
	
	$scope.nextPage=function() {
		$scope.page += 1;
		$scope.loadPercolatorQueries();
	};
	
	$scope.hasNextPage=function() {
		return $scope.page * 10 < $scope.total;
	};
	
	$scope.hasPreviousPage=function() {
		return $scope.page > 1;
	};
	
	$scope.firstResult=function() {
		return $scope.total > 0 ? ($scope.page - 1) * 10  + 1 : 0;
	};
	
	$scope.lastResult=function() {
		return $scope.hasNextPage() ? $scope.page * 10 : $scope.total;
	};
	
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
	};
	
	$scope.deletePercolatorQuery=function(query) {
		$scope.dialog_service.open(
			"are you sure you want to delete query " + query.id + " for index " + query.type + "?",
			query.sourceAsJSON(),
			"Delete",
			function() {
				$scope.client.deletePercolatorQuery(query.type, query.id,
					function(response) {
						$scope.client.refreshIndex("_percolator", 
							function(response) {
								$scope.updateModel(function() {
									$scope.alert_service.success("Query successfully deleted", response);
									$scope.loadPercolatorQueries();
								});
							},
							function(error) {
								$scope.updateModel(function() {
									$scope.alert_service.success("Error while reloading queries", error);
								});
							}
						);
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting query", error);
						});
					}
				);
			}
		);
	};
	
	$scope.createNewQuery=function() {
		$scope.new_query.source = $scope.editor.format();
		if (!isDefined($scope.editor.error)) {
			$scope.client.createPercolatorQuery($scope.new_query.index.name, $scope.new_query.id, $scope.new_query.source,
				function(response) {
					$scope.client.refreshIndex("_percolator", 
						function(response) {
							$scope.updateModel(function() {
								$scope.alert_service.success("Percolator Query successfully created", response);
								$scope.loadPercolatorQueries();
							});
						},
						function(error) {
							$scope.updateModel(function() {
								$scope.alert_service.success("Error while reloading queries", error);
							});
						}
					);
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while creating percolator query", error);
					});
				}
			);
		}
	};
	
	$scope.loadPercolatorQueries=function() {
		var params = {};
		try {
			var queries = $scope.parseSearchParams();
			if (queries.length > 0) {
				params.query = {"bool": {"must": queries}};
			}
			params.from = (($scope.page - 1) * 10);
			var index = isDefined($scope.index) ? $scope.index.name : null;
			$scope.client.fetchPercolateQueries(index, JSON.stringify(params),
				function(response) {
					$scope.updateModel(function() {
						$scope.total = response.hits.total;
						$scope.queries = response.hits.hits.map(function(q) { return new PercolateQuery(q); });
					});
				},
				function(error) {
					if (!(isDefined(error.responseJSON) && error.responseJSON.error == "IndexMissingException[[_percolator] missing]")) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while reading loading percolate queries", error);
						});
					}
				}
			);
		} catch (error) {
			$scope.alert_service.error("Filter is not a valid JSON");
			return;
		}
	};
	
	$scope.loadIndices=function() {
		$scope.indices = $scope.cluster.indices.filter(function(index) { return index != '_percolator'; });
	};
	
}

function PercolateQuery(query_info) {
	this.type = query_info._type;
	this.id = query_info._id;
	this.source = query_info._source;
	
	this.sourceAsJSON=function() {
		try {
			return JSON.stringify(this.source,undefined, 2);
		} catch (error) {

		}
	};
}
function ConfirmDialogController($scope, $location, $timeout, ConfirmDialogService) {

	$scope.dialog_service = ConfirmDialogService;
	
	$scope.close=function() {
		$scope.dialog_service.close();
	};
	
	$scope.confirm=function() {
		$scope.dialog_service.confirm();
	};
	
}
function WarmupController($scope, $location, $timeout, ConfirmDialogService, AlertService) {
	$scope.alert_service = AlertService;	
	$scope.dialog_service = ConfirmDialogService;
	
	$scope.editor = ace.edit("warmup-query-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");

	$scope.indices = [];
	$scope.warmers = {};
	$scope.index = null;
	$scope.warmer_id = "";
	
	// holds data for new warmer. maybe create a model for that
	$scope.new_warmer_id = '';
	$scope.new_index = '';
	$scope.new_source = '';
	$scope.new_types = '';
	
    $scope.$on('loadWarmupEvent', function() {
		$scope.loadIndices();
    });
	
	$scope.totalWarmers=function() {
		return Object.keys($scope.warmers).length;
	};
	
	$scope.loadIndices=function() {
		$scope.indices = $scope.cluster.indices;
	};
	
	$scope.createWarmerQuery=function() {
		$scope.formatBody();
		if (!isDefined($scope.validation_error)) {
			$scope.client.registerWarmupQuery($scope.new_index.name, $scope.new_types, $scope.new_warmer_id, $scope.new_source,
				function(response) {
					$scope.updateModel(function() {
						$scope.alert_service.success("Warmup query successfully registered", response);						
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Request did not return a valid JSON", error);						
					});
				}
			);
		}
	};
	
	$scope.deleteWarmupQuery=function(warmer_id, source) {
		$scope.dialog_service.open(
			"are you sure you want to delete query " + warmer_id + "?",
			source,
			"Delete",
			function() {
				$scope.client.deleteWarmupQuery($scope.index.name, warmer_id,
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Warmup query successfully deleted", response);
							$scope.loadIndexWarmers();
						});
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting warmup query", error);
						});
					}
				);
			}
		);
	};
	
	$scope.loadIndexWarmers=function() {
		if (isDefined($scope.index)) {
			$scope.client.getIndexWarmers($scope.index.name, $scope.warmer_id,
				function(response) {
					$scope.updateModel(function() {
						if (isDefined(response[$scope.index.name])) {
							$scope.warmers = response[$scope.index.name].warmers;
						} else {
							$scope.warmers = {};
						}
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while fetching warmup queries", error);
					});
				}
			);
		} else {
			$scope.warmers = {};
		}
	};
	
	$scope.formatBody=function() {
		var source = $scope.editor.getValue();
		try {
			$scope.validation_error = null;
			var sourceObj = JSON.parse(source);
			var formattedSource = JSON.stringify(sourceObj,undefined,4);
			$scope.editor.setValue(formattedSource,0);
			$scope.editor.gotoLine(0,0,false);
			$scope.new_source = formattedSource;
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	};
	
}
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
		return isDefined(this.response);
	};
	
	this.getResponse=function() {
		if (isDefined(this.response)) {
			return JSON.stringify(this.response, undefined, 2);			
		}
	};
};

kopf.factory('AlertService', function() {
	this.max_alerts = 3;

	this.alerts = [];
	
	// removes ALL alerts
	this.clear=function() {
		this.alerts.length = 0;
	};
	
	// remove a particular alert message
	this.remove=function(id) {
		$("#" + id).fadeTo(1000, 0).slideUp(200, function(){
			$(this).remove(); 
		});
		this.alerts = this.alerts.filter(function(a) { return id != a.id; });
	};
	
	// creates an error alert
	this.error=function(message, response, timeout) {
		timeout = isDefined(timeout) ? timeout : 15000;
		this.addAlert(new Alert(message, response, "error", "alert-danger", "icon-warning-sign"), timeout);
	};
	
	// creates an info alert
	this.info=function(message, response, timeout) {
		timeout = isDefined(timeout) ? timeout : 5000;
		this.addAlert(new Alert(message, response, "info", "alert-info", "icon-info"), timeout);
	};
	
	// creates success alert
	this.success=function(message, response, timeout) {
		timeout = isDefined(timeout) ? timeout : 5000;
		this.addAlert(new Alert(message, response, "success", "alert-success", "icon-ok"), timeout);
	};
	
	// creates a warn alert
	this.warn=function(message, response, timeout) {
		timeout = isDefined(timeout) ? timeout : 10000;
		this.addAlert(new Alert(message, response, "warn", "alert-warning", "icon-info"), timeout);
	};
	
	this.addAlert=function(alert, timeout) {
		this.alerts.unshift(alert);
		var service = this;
		setTimeout(function() { service.remove(alert.id); }, timeout);		
		if (this.alerts.length >= this.max_alerts) {
			this.alerts.length = 3;
		}
	};
	
	return this;
});
kopf.factory('SettingsService', function() {
	
	this.refresh_interval = 3000;
	
	this.setRefreshInterval=function(interval) {
		this.refresh_interval = interval;
		localStorage.kopf_refresh_interval = interval;
	};
	
	this.getRefreshInterval=function() {
		if (isDefined(localStorage.kopf_refresh_interval) && isDefined(localStorage.kopf_refresh_interval)) {
			return localStorage.kopf_refresh_interval;
		} else {
			return this.refresh_interval;
		}
	};
	
	return this;
});
function AceEditor(target) {
	// ace editor
	this.editor = ace.edit(target);
	this.editor.setFontSize("10px");
	this.editor.setTheme("ace/theme/kopf");
	this.editor.getSession().setMode("ace/mode/json");
	
	// validation error
	this.error = null;
	
	// sets value and moves cursor to beggining
	this.setValue=function(value) {
		this.editor.setValue(value,1);
		this.editor.gotoLine(0,0,false);
	};
	
	this.getValue=function() {
		return this.editor.getValue();
	};
	
	// formats the json content
	this.format=function() {
		var content = this.editor.getValue();
		try {
			if (isDefined(content) && content.trim().length > 0) {
				this.error = null;
				content = JSON.stringify(JSON.parse(content),undefined,4);
				this.editor.setValue(content,0);
				this.editor.gotoLine(0,0,false);
			}
		} catch (error) {
			this.error = error.toString();
		}
		return content;
	};
}