function createIndex(host, name, settings) {
	var response = syncRequest('POST', host + "/" + name, settings);
	if (!response.success) {
		throw response.response;
	}
	return response.response;
}

function enableShardAllocation(host) {
	var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":false }};
	var response = syncRequest('PUT', host + "/_cluster/settings",JSON.stringify(new_settings, undefined, ""));
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function disableShardAllocation(host) {
	var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":true }};
	var response = syncRequest('PUT', host + "/_cluster/settings",JSON.stringify(new_settings, undefined, ""));
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function getClusterState(host) {
	var response = syncRequest('GET',host+"/_cluster/state",{});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function shutdownNode(host,node_id) {
	var response = syncRequest('POST',host + "/_cluster/nodes/" + node_id + "/_shutdown", {});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function openIndex(host,index) {
	var response = syncRequest('POST', host + "/" + index + "/_open", {});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function optimizeIndex(host,index) {
	var response = syncRequest('POST',host + "/" + index + "/_optimize", {});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function clearCache(host,index) {
	var response = syncRequest('POST',host + "/" + index + "/_cache/clear", {});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function closeIndex(host,index) {
	var response = syncRequest('POST', host + "/" + index + "/_close", {});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function refreshIndex(host,index) {
	var response = syncRequest('POST', host + "/" + index + "/_refresh", {});
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function deleteIndex(host, name) {
	var response = syncRequest('DELETE', host + "/" + name);
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function updateIndexSettings(host, name, settings) {
	var response = syncRequest('PUT', host + "/" + name + "/_settings", settings);
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function updateClusterSettings(host, settings) {
	var response = syncRequest('PUT', host + "/_cluster/settings", settings);
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function getNodes(host) {
	var nodes = [];
	var response = syncRequest('GET', host + "/_cluster/state",{});
	if (!response.success) {
		throw response.response;
	}
	Object.keys(response.response['nodes']).forEach(function(node_id) {
		nodes.push(new Node(node_id,response.response['nodes'][node_id]));
	});
	return nodes;
}

function fetchAliases(host) {
	var response = syncRequest('GET', host + "/_aliases",{});
	if (!response.success) {
		throw response.response;
	}
	return new Aliases(response.response);		
}

function analyzeByField(host, index, type, field, text) {
	var response = syncRequest('GET', host + "/" + index + "/_analyze?field=" + type +"."+field,{'text':text});
	if (!response.success) {
		throw response.response;
	}
	return response.response['tokens'].map(function (token) {
		return new Token(token['token'],token['start_offset'],token['end_offset'],token['position']);
	});
}

function analyzeByAnalyzer(host, index, analyzer, text) {
	var response = syncRequest('GET', host + "/" + index + "/_analyze?analyzer=" + analyzer,{'text':text});
	if (!response.success) {
		throw response.response;
	}
	return response.response['tokens'].map(function (token) {
		new Token(token['token'],token['start_offset'],token['end_offset'],token['position']);
	});
}

function updateAliases(host,add_aliases,remove_aliases) {
	var data = {};
	data['actions'] = [];
	add_aliases.forEach(function(add_info) {
		data['actions'].push({'add':add_info});
	});
	remove_aliases.forEach(function(add_info) {
		data['actions'].push({'remove':add_info});
	});
	var response = syncRequest('POST', host + "/_aliases",JSON.stringify(data, undefined, ""));
	if (!response.success) {
		throw response.response;
	}
	return response;
}

function compareNodes(a,b) { // TODO: take into account node specs?
	if (b.current_master) {
		return 1;
	}
	if (a.current_master) {
		return -1;
	}
	if (b.master && !a.master) {
		return 1;
	} 
	if (a.master && !b.master) {
		return -1;
	}
	
	if (b.data && !a.data) {
		return 1;
	} 
	if (a.data && !b.data) {
		return -1;
	}
	return a.name.localeCompare(b.name);
}

function compareIndices(a,b) { // TODO: take into account index properties?
	return a.name.localeCompare(b.name);
}

function getNodesStats(host) {
	var response = syncRequest('GET',host+"/_nodes/stats?all=true",{});
	if (!response.success) {
		throw response.response;
	}
	return response.response;
}

function syncRequest(method, url, data) {
	var response;
	$.ajax({
	    type: method,
	    url: url,
	    dataType: 'json',
	    success: function(r) { 
			response = new ServerResponse(true,r) 
		},
		error: function(r) { 
			response = new ServerResponse(false,r) 
		},
	    data: data,
	    async: false
	});
	return response;
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
		indices.push(index);
		var indexAliases = aliases_info[index]['aliases'];
		Object.keys(indexAliases).forEach(function(alias) {
			if (!isDefined(aliases_map[alias])) {
				aliases_map[alias] = [];
			}
			aliases_map[alias].push(index);
		});
	});
	this.indices = indices;
	this.info = aliases_map;
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
		}).sort(compareNodes);
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
		).sort(compareIndices);
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
}

function ServerResponse(success, response) {
	this.success = success;
	this.response = response;
}
/** ####### END OF REFACTORED AREA ####### **/

function getClusterHealth(host, callback_success, callback_error) {
	$.when(
		$.ajax({ type: 'GET', url: host+"/_cluster/health", dataType: 'json', data: {}})).then(
			function(cluster_health) {
				callback_success(new ClusterHealth(cluster_health));
			},
			function(cluster_health) {
				callback_error(cluster_health);
			}
	);
}

function getClusterDetail(host, callback) {
	$.when(
		$.ajax({ type: 'GET', url: host+"/_cluster/state", dataType: 'json', data: {}}),
		$.ajax({ type: 'GET', url: host+"/_cluster/nodes/stats?all=true", dataType: 'json', data: {}}),
		$.ajax({ type: 'GET', url: host+"/_status", dataType: 'json', data: {}}),
		$.ajax({ type: 'GET', url: host+"/_cluster/settings", dataType: 'json', data: {}})).done(
			function(cluster_state,nodes_stats,cluster_status,settings) {
				callback(new Cluster(cluster_state[0],cluster_status[0],nodes_stats[0],settings[0]));
			}
		);
} 

function getClusterDiagnosis(host,callback_success,callback_error) {
	$.when(
		$.ajax({ type: 'GET', url: host+"/_cluster/state", dataType: 'json', data: {}}),
		$.ajax({ type: 'GET', url: host+"/_cluster/nodes/stats?all=true", dataType: 'json', data: {}}),
		$.ajax({ type: 'GET', url: host+"/_nodes/hot_threads", data: {}})
	).then(
			function(state, stats, hot_threads) {
				callback_success(state[0], stats[0], hot_threads[0]);
			},
			function(failed_request) {
				callback_error(failed_request);
			}
		);
}