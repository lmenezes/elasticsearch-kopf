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