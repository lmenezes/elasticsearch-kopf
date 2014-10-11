kopf.factory('ElasticService', ['$http','$q', 'ExternalSettingsService', function($http, $q, ExternalSettingsService) {
    this.client = null;
    this.connection = null;

    this.connect=function(url) {
        var root = ExternalSettingsService.getElasticsearchRootPath();
        var with_credentials = ExternalSettingsService.withCredentials();
        try {
            this.client = null;
            this.connection = null;
            if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) {
                url = "http://" + url;
            }
            this.connection = new ESConnection(url + root, with_credentials);
            this.client = new ElasticClient(this.connection, $http, $q);
        } catch (error) {
            throw { message: "Error while connecting to [" + url + root + "]", body: error };
        }
    };

    this.isConnected=function() {
      return isDefined(this.client);
    };

    this.getHost=function() {
        return isDefined(this.connection) ? this.connection.host : '';
    };

    return this;

}]);