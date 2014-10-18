function Index(indexName, clusterState, indexInfo, indexStatus, aliases) {
  this.name = indexName;
  this.shards = null;
  this.metadata = {};
  this.state = 'close';
  this.num_of_shards = 0;
  this.num_of_replicas = 0;
  this.aliases = [];
  if (isDefined(aliases)) {
    var indexAliases = aliases.aliases;
    if (isDefined(indexAliases)) {
      this.aliases = Object.keys(aliases.aliases);
    }
  }

  this.visibleAliases = function() {
    return this.aliases.length > 5 ? this.aliases.slice(0, 5) : this.aliases;
  };

  if (isDefined(clusterState)) {
    var routing = getProperty(clusterState, 'routing_table.indices');
    this.state = 'open';
    if (isDefined(routing)) {
      var shards = Object.keys(routing[indexName].shards);
      this.num_of_shards = shards.length;
      var shardMap = routing[indexName].shards;
      this.num_of_replicas = shardMap[0].length - 1;
    }
  }
  this.num_docs = getProperty(indexStatus, 'docs.num_docs', 0);
  this.max_doc = getProperty(indexStatus, 'docs.max_doc', 0);
  this.deleted_docs = getProperty(indexStatus, 'docs.deleted_docs', 0);
  this.size = getProperty(indexStatus, 'index.primary_size_in_bytes', 0);
  this.total_size = getProperty(indexStatus, 'index.size_in_bytes', 0);
  this.size_in_bytes = readablizeBytes(this.size);
  this.total_size_in_bytes = readablizeBytes(this.total_size);

  this.unassigned = [];
  this.unhealthy = false;

  this.getShards = function(nodeId) {
    if (isDefined(indexInfo)) {
      if (this.shards === null) {
        var indexShards = {};
        var unassigned = [];
        this.unassigned = unassigned;
        $.map(indexInfo.shards, function(shards, shardNum) {
          $.map(shards, function(shardRouting, shardCopy) {
            if (shardRouting.node === null) {
              unassigned.push(new UnassignedShard(shardRouting));
            } else {
              if (!isDefined(indexShards[shardRouting.node])) {
                indexShards[shardRouting.node] = [];
              }
              var shardStatus = null;
              if (isDefined(indexStatus) &&
                  isDefined(indexStatus.shards[shardRouting.shard])) {
                indexStatus.shards[shardRouting.shard].forEach(
                    function(status) {
                      if (status.routing.node == shardRouting.node &&
                          status.routing.shard == shardRouting.shard) {
                        shardStatus = status;
                      }
                    });
              }
              var newShard = new Shard(shardRouting, shardStatus);
              indexShards[shardRouting.node].push(newShard);
            }
          });
        });
        this.shards = indexShards;
      }
    } else {
      this.shards = {};
    }
    return this.shards[nodeId];
  };

  if (isDefined(clusterState) && isDefined(clusterState.routing_table)) {
    var instance = this;
    var shardsMap = clusterState.routing_table.indices[this.name].shards;
    Object.keys(shardsMap).forEach(function(shardNum) {
      shardsMap[shardNum].forEach(function(shard) {
        if (shard.state != 'STARTED') {
          instance.unhealthy = true;
        }
      });
    });
  }

  this.special = this.name.indexOf('.') === 0 || this.name.indexOf('_') === 0;

  this.compare = function(b) { // TODO: take into account index properties?
    return this.name.localeCompare(b.name);
  };

  this.equals = function(index) {
    return index !== null && index.name == this.name;
  };

  this.closed = function() {
    return this.state === 'close';
  };

  this.open = function() {
    return this.state === 'open';
  };
}
