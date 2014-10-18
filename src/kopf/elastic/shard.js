function Shard(routing, info) {
  this.info = isDefined(info) ? info : routing;
  this.primary = routing.primary;
  this.shard = routing.shard;
  this.state = routing.state;
  this.node = routing.node;
  this.index = routing.index;
  this.id = this.node + '_' + this.shard + '_' + this.index;
}

function UnassignedShard(info) {
  this.primary = info.primary;
  this.shard = info.shard;
  this.state = info.state;
  this.node = info.node;
  this.index = info.index;
  this.id = this.node + '_' + this.shard + '_' + this.index;
}
