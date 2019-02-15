function Node(nodeId, nodeStats, nodeInfo) {
  this.id = nodeId;
  this.name = nodeInfo.name;
  this.elasticVersion = nodeInfo.version;
  this.jvmVersion = nodeInfo.jvm.version;
  this.availableProcessors = nodeInfo.os.available_processors;
  this.transportAddress = nodeInfo.transport_address;
  this.host = nodeInfo.host;

  var roles = getProperty(nodeInfo, 'roles', []);
  this.master = roles.indexOf('master') < 0 ? false : true;
  this.data = roles.indexOf('data') < 0 ? false : true;
  this.client = !this.master && !this.data;
  this.current_master = false;

  this.stats = nodeStats;
  this.uptime = nodeStats.jvm.uptime_in_millis;

  this.heap_used = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_used_in_bytes'));

  this.heap_committed = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_committed_in_bytes'));

  this.heap_used_percent = getProperty(this.stats, 'jvm.mem.heap_used_percent');

  this.heap_max = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_max_in_bytes'));

  this.disk_total_in_bytes = getProperty(this.stats, 'fs.total.total_in_bytes');
  this.disk_free_in_bytes = getProperty(this.stats, 'fs.total.free_in_bytes');
  var diskUsedInBytes = (this.disk_total_in_bytes - this.disk_free_in_bytes);
  var usedRatio = (diskUsedInBytes / this.disk_total_in_bytes);
  this.disk_used_percent = Math.round(100 * usedRatio);

  this.cpu = getProperty(this.stats, 'process.cpu.percent');

  var loadAverage = getProperty(this.stats, 'os.cpu.load_average');
  this.load_average = loadAverage === undefined ? 0 : loadAverage['1m'];

  this.setCurrentMaster = function() {
    this.current_master = true;
  };

  this.equals = function(node) {
    return node.id === this.id;
  };

}
