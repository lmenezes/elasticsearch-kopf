function getClusterHealth(host, callback) {
	$.when(
	$.ajax({ type: 'GET', url: host+"/_cluster/health", dataType: 'json', data: {}})).done(
		function(cluster_health) {
			callback(new ClusterHealth(cluster_health));
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

function fetchAliases(host) {
	var response = syncRequest('GET', host + "/_aliases",{}).response;
	return new Aliases(response);
}

function Aliases(aliases_info) {
	var indices  = []
	var aliases_map = {};
	Object.keys(aliases_info).forEach(function(index) {
		indices.push(index);
		var indexAliases = aliases_info[index]['aliases'];
		Object.keys(indexAliases).forEach(function(alias) {
			if (typeof aliases_map[alias] == 'undefined') {
				aliases_map[alias] = [];
			}
			aliases_map[alias].push(index);
		});
	});
	this.indices = indices;
	this.info = aliases_map;
}

function flipDisableShardAllocation(host,current_state) {
	var new_state = current_state == true ? "false" : "true";
	var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":new_state	}};
	return syncRequest('PUT', host + "/_cluster/settings",JSON.stringify(new_settings, undefined, ""));
}

function ServerResponse(success, response) {
	this.success = success;
	this.response = response;
}

function shutdownNode(host,node_id) {
	return syncRequest('POST',host + "/_cluster/nodes/" + node_id + "/_shutdown", {});
}

function openIndex(host,index) {
	return syncRequest('POST', host + "/" + index + "/_open", {});
}

function setReplicas(host,index,replicas) {
	return syncRequest('PUT', host + "/" + index + "/_settings", {"number_of_replicas":replicas});
}

function optimizeIndex(host,index) {
	return syncRequest('POST',host + "/" + index + "/_optimize", {});
}

function clearCache(host,index) {
	return syncRequest('POST',host + "/" + index + "/_cache/clear", {});
}

function closeIndex(host,index) {
	return syncRequest('POST', host + "/" + index + "/_close", {});	
}

function refreshIndex(host,index) {
	return syncRequest('POST', host + "/" + index + "/_refresh", {});	
}
function createIndex(host, name, settings) {
	return syncRequest('PUT', host + "/" + name, settings);	
}

function deleteIndex(host, name) {
	return syncRequest('DELETE', host + "/" + name);	
}

function updateIndexSettings(host, name, settings) {
	return syncRequest('PUT', host + "/" + name + "/_settings", settings);	
}

function updateClusterSettings(host, settings) {
	return syncRequest('PUT', host + "/_cluster/settings", settings);	
}

function ClusterHealth(health) {
	this.status = health['status'];
	this.name = health['cluster_name'];
}

// Cluster Object. Contains all the information about the cluster
function Cluster(state,status,nodes,settings) {
	if (state != null && status != null && nodes != null && settings != null) {
		this.disableAllocation = "false";
		if (typeof settings['persistent'] != undefined && typeof settings['persistent']['disable_allocation'] != undefined) {
			this.disableAllocation = settings['persistent']['disable_allocation'];
		}
		if (typeof settings['transient'] != undefined && typeof settings['transient']['cluster.routing.allocation.disable_allocation'] != undefined) {
			this.disableAllocation = settings['transient']['cluster.routing.allocation.disable_allocation'] === "true" ? "true" : "false";
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

// Represents an ElasticSearch node
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

function Index(index_name,index_info, index_metadata, index_status) {
	this.name = index_name;
	var index_shards = {};
	this.shards = index_shards;
	this.state = index_metadata['state'];
	this.metadata = {};
	this.aliases = index_metadata['aliases'];
	this.settings = index_metadata['settings'];
	this.mappings = index_metadata['mappings'];
	this.metadata['settings'] = this.settings;
	this.metadata['mappings'] = this.mappings;
	this.num_of_shards = index_metadata['settings']['index.number_of_shards'];
	this.num_of_replicas = index_metadata['settings']['index.number_of_replicas'];
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
		return JSON.stringify(this.settings, undefined, "  ");
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

// TODO: take into account node specs
function compareNodes(a,b) {
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

// TODO: take into account index properties
function compareIndices(a,b) {
	return a.name.localeCompare(b.name);
}

function syncRequest(method, url, data) {
	var response;
	$.ajax({
	    type: method,
	    url: url,
	    dataType: 'json',
	    success: function(r) { response = new ServerResponse(true,r) },
		error: function(r) { response = new ServerResponse(false,r) },
	    data: data,
	    async: false
	});
	return response;
}