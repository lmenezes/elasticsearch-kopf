function BrokenCluster(health, state, nodes, settings) {

  this.status = health.status;
  this.initializing_shards = health.initializing_shards;
  this.active_primary_shards = health.active_primary_shards;
  this.active_shards = health.active_shards;
  this.relocating_shards = health.relocating_shards;
  this.unassigned_shards = health.unassigned_shards;
  this.number_of_nodes = health.number_of_nodes;
  this.number_of_data_nodes = health.number_of_data_nodes;
  this.timed_out = health.timed_out;
  this.shards = this.active_shards + this.relocating_shards +
  this.unassigned_shards + this.initializing_shards;
  this.fetched_at = getTimeString(new Date());

  this.name = state.cluster_name;
  this.master_node = state.master_node;

  this.disableAllocation = 'false';
  var persistentAllocation = getProperty(settings,
      'persistent.cluster.routing.allocation.enable', 'all');

  var transientAllocation = getProperty(settings,
      'transient.cluster.routing.allocation.enable', '');

  if (transientAllocation !== '') {
    this.disableAllocation = transientAllocation == 'all' ? 'false' : 'true';
  } else {
    if (persistentAllocation != 'all') {
      this.disableAllocation = 'true';
    }
  }

  this.settings = settings;

  var totalSize = 0;

  this.nodes = Object.keys(state.nodes).map(function(nodeId) {
    var nodeState = state.nodes[nodeId];
    var nodeStats = nodes.nodes[nodeId];
    var node = new Node(nodeId, nodeState, nodeStats);
    if (nodeId === state.master_node) {
      node.setCurrentMaster();
    }
    return node;
  });

  this.getNodes = function() {
    return this.nodes;
  };

  this.total_size = readablizeBytes(totalSize);
  this.total_size_in_bytes = totalSize;
  this.indices = [];
}
