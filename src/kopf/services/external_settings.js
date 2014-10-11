kopf.factory('ExternalSettingsService', function ($http, $q) {

    this.settings = null;

    this.getSettings=function() {
        if (!isDefined(this.settings)) {
            this.settings = {};
            var settings = this.settings;
            var settings_future = $.ajax({ type: 'GET', url: "./kopf_external_settings.json", dataType: 'json', async: false });
            settings_future.done(function (data) {
                try {
                    Object.keys(data).forEach(function (setting) {
                        settings[setting] = data[setting];
                    });
                } catch (error) {
                    throw { message: "Error processing external settings", body: data };
                }
            });
            settings_future.fail(function (error) {
                throw { message: "Error fetching external settings from file", body: error };
            });
        }
        return this.settings;
    };

    this.getElasticsearchRootPath=function() { return this.getSettings().elasticsearch_root_path; };

    this.withCredentials=function() { return this.getSettings().with_credentials; };

    return this;

});