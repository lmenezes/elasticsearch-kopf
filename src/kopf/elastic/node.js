function Node(nodeId, nodeInfo, nodeStats) {
  this.id = nodeId;
  this.name = nodeInfo.name;
  this.metadata = {};
  this.metadata.info = nodeInfo;
  this.metadata.stats = nodeStats;
  this.transportAddress = parseAddress(nodeInfo.transport_address);
  this.host = nodeStats.host;
  var master = nodeInfo.attributes.master === 'false' ? false : true;
  var data = nodeInfo.attributes.data === 'false' ? false : true;
  var client = nodeInfo.attributes.client === 'true' ? true : false;
  this.master = master && !client;
  this.data = data && !client;
  this.client = client || !master && !data;
  this.current_master = false;
  this.stats = nodeStats;

  this.heap_used = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_used_in_bytes'));

  this.heap_committed = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_committed_in_bytes'));

  this.heap_used_percent = getProperty(this.stats, 'jvm.mem.heap_used_percent');

  this.heap_max = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_max_in_bytes'));

  var totalInBytes = getProperty(this.stats, 'fs.total.total_in_bytes');
  var freeInBytes = getProperty(this.stats, 'fs.total.free_in_bytes');

  this.disk_total = readablizeBytes(totalInBytes);
  this.disk_free = readablizeBytes(freeInBytes);
  var usedRatio = (totalInBytes - freeInBytes) / totalInBytes;
  this.disk_used_percent = Math.round(100 * usedRatio);

  this.cpu_user = getProperty(this.stats, 'os.cpu.user');
  this.cpu_sys = getProperty(this.stats, 'os.cpu.sys');
  this.cpu = this.cpu_user + this.cpu_sys;

  this.load_average = getProperty(this.stats, 'os.load_average');

  this.minuteAverage = this.load_average ? this.load_average[0] : 0;

  this.setCurrentMaster = function() {
    this.current_master = true;
  };

  this.equals = function(node) {
    return node.id === this.id;
  };

  function parseAddress(address) {
    return address.substring(address.indexOf('/') + 1, address.length - 1);
  }

}
