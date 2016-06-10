function Stats(node, indice) {
  var n_stats = node.stats;
  var n_indices = n_stats.indices;

  this.node_name = node.name;

  this.store_size = n_indices.store.size_in_bytes;
  this.documents = n_indices.docs.count;
  this.documents_deleted = n_indices.docs.deleted / n_indices.docs.count;
  this.merge_size = n_indices.merges.total_size_in_bytes;
  this.merge_time = n_indices.merges.total_time_in_millis;
  this.file_descriptors = n_stats.process.open_file_descriptors;
  this.disk_space_used = node.disk_used_percent;
  this.disk_space_free = Math.round((n_stats.fs.total.free_in_bytes / Math.pow(1024, 3)) * 100) / 100;

  this.indexing = {
    index: n_indices.indexing.index_time_in_millis / n_indices.indexing.index_total,
    delete: n_indices.indexing.delete_time_in_millis / n_indices.indexing.delete_total
  };
  this.search = {
    query: node.stats.indices.search.query_time_in_millis / node.stats.indices.search.query_total,
    fetch: node.stats.indices.search.fetch_time_in_millis / node.stats.indices.search.fetch_total
  };
  this.get = {
    total: node.stats.indices.get.time_in_millis / node.stats.indices.get.total,
    exists: node.stats.indices.get.exists_time_in_millis / node.stats.indices.get.exists_total,
    missing: node.stats.indices.get.missing_time_in_millis / node.stats.indices.get.missing_total
  };
  this.refresh = node.stats.indices.refresh.total_time_in_millis / node.stats.indices.refresh.total;
  this.flush = node.stats.indices.flush.total_time_in_millis / node.stats.indices.flush.total;

  this.field_size = node.stats.indices.fielddata.memory_size_in_bytes;
  this.field_evictions = node.stats.indices.fielddata.evictions;

  this.total_memory = (node.stats.os.mem.actual_used_in_bytes + node.stats.os.mem.actual_free_in_bytes) / Math.pow(1024, 3);
  this.heap_size = Math.round((node.stats.jvm.mem.heap_committed_in_bytes / (Math.pow(1024, 3))) * 100) / 100;
  this.heap_porcent_ram = node.stats.jvm.mem.heap_committed_in_bytes / (node.stats.os.mem.actual_used_in_bytes + node.stats.os.mem.actual_free_in_bytes);
  this.heap_usage_porcent = Math.round((node.stats.jvm.mem.heap_used_in_bytes / node.stats.jvm.mem.heap_committed_in_bytes) * 1000) / 10;
  this.swap_space = Math.round((node.stats.os.swap.used_in_bytes / Math.pow(1024, 2)) * 100000) / 100000;

}
;

