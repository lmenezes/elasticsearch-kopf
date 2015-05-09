kopf.factory('PageService', ['ElasticService', 'DebugService', '$rootScope',
  '$document', function(ElasticService, DebugService, $rootScope, $document) {

    var instance = this;

    var clusterStatus;
    var clusterName;

    var link = $document[0].querySelector('link[rel~=\'icon\']');

    if (link) {
      var faviconUrl = link.href;
      var img = $document[0].createElement('img');
      img.src = faviconUrl;
    }

    $rootScope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(cluster, oldValue) {
          instance.setFavIconColor(cluster ? cluster.status : undefined);
          instance.setPageTitle(cluster ? cluster.name : undefined);
        }
    );

    this.setPageTitle = function(name) {
      if (name && name !== clusterName) {
        clusterName = name;
        $rootScope.title = 'kopf[' + name + ']';
      } else {
        $rootScope.title = 'kopf - no connection';
      }
    };

    this.setFavIconColor = function(status) {
      if (link && clusterStatus !== status) {
        try {
          clusterStatus = status;
          var colors = {green: '#468847', yellow: '#c09853', red: '#B94A48'};
          var color = status ? colors[status] : '#333';
          var canvas = $document[0].createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          var context = canvas.getContext('2d');
          context.drawImage(img, 0, 0);
          context.globalCompositeOperation = 'source-in';
          context.fillStyle = color;
          context.fillRect(0, 0, 32, 32);
          context.fill();
          link.type = 'image/x-icon';
          link.href = canvas.toDataURL();
        } catch (exception) {
          DebugService.debug('Error while changing favicon', exception);
        }
      }
    };

    return this;

  }]);
