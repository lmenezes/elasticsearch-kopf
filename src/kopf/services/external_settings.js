kopf.factory('ExternalSettingsService', function($http, $q) {

  var ES_ROOT_PATH = 'elasticsearch_root_path';

  var WITH_CREDENTIALS = 'with_credentials';

  this.settings = null;

  this.getSettings = function() {
    if (!isDefined(this.settings)) {
      this.settings = {};
      var settings = this.settings;
      var params = {
        type: 'GET',
        url: './kopf_external_settings.json',
        dataType: 'json',
        async: false
      };
      var settingsFuture = $.ajax(params);
      settingsFuture.done(function(data) {
        try {
          Object.keys(data).forEach(function(setting) {
            settings[setting] = data[setting];
          });
        } catch (error) {
          throw {
            message: 'Error processing external settings',
            body: data
          };
        }
      });
      settingsFuture.fail(function(error) {
        throw {
          message: 'Error fetching external settings from file',
          body: error
        };
      });
    }
    return this.settings;
  };

  this.getElasticsearchRootPath = function() {
    return this.getSettings()[ES_ROOT_PATH];
  };

  this.withCredentials = function() {
    return this.getSettings()[WITH_CREDENTIALS];
  };

  return this;

});
