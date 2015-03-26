function Index(indexName, clusterState, indexStatus, aliases) {
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

  this.equals = function(index) {
    return index !== null && index.name == this.name;
  };

  this.closed = this.state === 'close';

  this.open = this.state === 'open';

}
