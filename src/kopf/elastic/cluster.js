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
			if (new_cluster != null) {
				nodes.forEach(function(node) {
					for (var i = 0; i < new_cluster.nodes.length; i++) {
						if (new_cluster.nodes[i].equals(node)) {
							node = null;
							break;
						}
					}
					if (node != null) {
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
						if (node != null) {
							changes.addJoiningNode(node);	
						}
					});
				}
			}
			return changes;
		}
	}
}