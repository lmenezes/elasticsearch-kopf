kopf.factory('ClusterService', ['$timeout', 'ElasticService', 'SettingsService',
  'AlertService',
  function($timeout, ElasticService, SettingsService, AlertService) {

    this.cluster = null;
    this.clusterHealth = null;

    var instance = this;

    this.refresh = function() {
      if (ElasticService.isConnected()) {
        $timeout(function() {
          ElasticService.client.getClusterDetail(
              function(cluster) {
                cluster.computeChanges(instance.cluster);
                instance.cluster = cluster;
                instance.alertClusterChanges();
              },
              function(error) {
                AlertService.error('Error refreshing cluster state', error);
                instance.cluster = null;
              }
          );
          ElasticService.client.getClusterHealth(
              function(clusterHealth) {
                instance.clusterHealth = clusterHealth;
              },
              function(error) {
                instance.clusterHealth = null;
                AlertService.error('Error refreshing cluster health', error);
              }
          );
        }, 100);
      } else {
        this.cluster = null;
        this.cluster_health = null;
      }
    };

    this.autoRefreshCluster = function() {
      this.refresh();
      $timeout(function() {
        instance.autoRefreshCluster();
      }, SettingsService.getRefreshInterval());
    };

    this.autoRefreshCluster();

    this.alertClusterChanges = function() {
      if (isDefined(this.cluster)) {
        var changes = this.cluster.changes;
        if (changes.hasChanges()) {
          if (changes.hasJoins()) {
            var joins = changes.nodeJoins.map(function(node) {
              return node.name + '[' + node.transport_address + ']';
            });
            AlertService.info(joins.length + ' new node(s) joined the cluster',
                joins);
          }
          if (changes.hasLeaves()) {
            var leaves = changes.nodeLeaves.map(function(node) {
              return node.name + '[' + node.transport_address + ']';
            });
            AlertService.warn(changes.nodeLeaves.length +
                ' node(s) left the cluster', leaves);
          }
          if (changes.hasCreatedIndices()) {
            var created = changes.indicesCreated.map(function(index) {
              return index.name;
            });
            AlertService.info(changes.indicesCreated.length +
                ' indices created: [' + created.join(',') + ']');
          }
          if (changes.hasDeletedIndices()) {
            var deleted = changes.indicesDeleted.map(function(index) {
              return index.name;
            });
            AlertService.info(changes.indicesDeleted.length +
                ' indices deleted: [' + deleted.join(',') + ']');
          }
        }
      }
    };

    return this;

  }

]);
