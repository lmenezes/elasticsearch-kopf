function Cluster(state, status, nodes, settings, aliases) {
  this.created_at = new Date().getTime();

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
  var numDocs = 0;

  this.nodes = Object.keys(state.nodes).map(function(nodeId) {
    var nodeState = state.nodes[nodeId];
    var nodeStats = nodes.nodes[nodeId];
    var node = new Node(nodeId, nodeState, nodeStats);
    if (nodeId === state.master_node) {
      node.setCurrentMaster();
    }
    return node;
  });

  this.getNodes = function(considerType) {
    return this.nodes.sort(function(a, b) {
      return a.compare(b, considerType);
    });
  };

  this.number_of_nodes = this.nodes.length;

  var iRoutingTable = state.routing_table.indices;
  var iStatus = status.indices;
  var specialIndices = 0;
  this.indices = Object.keys(iRoutingTable).map(function(indexName) {
    var indexInfo = iRoutingTable[indexName];
    var indexStatus = iStatus[indexName];
    var indexAliases = aliases[indexName];
    var index = new Index(indexName, state, indexInfo, indexStatus,
        indexAliases);
    if (index.special) {
      specialIndices++;
    }
    totalSize += parseInt(index.total_size);
    numDocs += index.num_docs;
    return index;
  });

  if (isDefined(state.blocks.indices)) {
    var indices = this.indices;
    Object.keys(state.blocks.indices).forEach(function(indexName) {
      // INDEX_CLOSED_BLOCK = new ClusterBlock(4, "index closed", ...
      if (state.blocks.indices[indexName]['4']) {
        indices.push(new Index(indexName));
      }
    });
  }
  this.indices = this.indices.sort(function(a, b) {
    return a.compare(b);
  });

  this.special_indices = specialIndices;
  this.num_docs = numDocs;
  this.total_indices = this.indices.length;

  this.shards = status._shards.total;
  this.failed_shards = status._shards.failed;
  this.successful_shards = status._shards.successful;
  this.unassigned_shards = state.routing_nodes.unassigned.length;

  this.total_size = readablizeBytes(totalSize);
  this.total_size_in_bytes = totalSize;
  this.changes = null;

  this.computeChanges = function(oldCluster) {
    var nodes = this.nodes;
    var indices = this.indices;
    var changes = new ClusterChanges();
    if (isDefined(oldCluster) && this.name === oldCluster.name) {
      // checks for node differences
      oldCluster.nodes.forEach(function(node) {
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].equals(node)) {
            node = null;
            break;
          }
        }
        if (isDefined(node)) {
          changes.addLeavingNode(node);
        }
      });

      if (oldCluster.nodes.length != nodes.length || !changes.hasJoins()) {
        nodes.forEach(function(node) {
          for (var i = 0; i < oldCluster.nodes.length; i++) {
            if (oldCluster.nodes[i].equals(node)) {
              node = null;
              break;
            }
          }
          if (isDefined(node)) {
            changes.addJoiningNode(node);
          }
        });
      }

      // checks for indices differences
      oldCluster.indices.forEach(function(index) {
        for (var i = 0; i < indices.length; i++) {
          if (indices[i].equals(index)) {
            index = null;
            break;
          }
        }
        if (isDefined(index)) {
          changes.addDeletedIndex(index);
        }
      });

      var equalNumberOfIndices = oldCluster.indices.length != indices.length;
      if (equalNumberOfIndices || !changes.hasCreatedIndices()) {
        indices.forEach(function(index) {
          for (var i = 0; i < oldCluster.indices.length; i++) {
            if (oldCluster.indices[i].equals(index)) {
              index = null;
              break;
            }
          }
          if (isDefined(index)) {
            changes.addCreatedIndex(index);
          }
        });
      }
      var docDelta = this.num_docs - oldCluster.num_docs;
      // var docRate = docDelta / ((this.created_at - old_cluster.created_at) / 1000);
      changes.setDocDelta(docDelta);
      var dataDelta = this.total_size_in_bytes - oldCluster.total_size_in_bytes;
      changes.setDataDelta(dataDelta);
    }
    this.changes = changes;
  };

  this.open_indices = function() {
    return $.map(this.indices, function(index) {
      if (index.state == 'open') {
        return index;
      } else {
        return null;
      }
    });
  };

}
