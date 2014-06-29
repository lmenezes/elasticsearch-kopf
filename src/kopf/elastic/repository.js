function Repository(name, info) {
	this.name = name;
	this.type = info.type;
	this.settings = info.settings;

    this.asJson=function() {
        var json = { type: this.type };
        if (this.type === 'fs') {
            var fsSettings = ['location', 'chunk_size', 'max_restore_bytes_per_sec', 'max_snapshot_bytes_per_sec', 'compress'];
            json.settings = this.getSettings(fsSettings);
        }
        if (this.type === 'url') {
            var urlSettings = ['url'];
            json.settings = this.getSettings(urlSettings);
        }
        if (this.type === 's3') {
            var s3Settings = ['region', 'bucket', 'base_path', 'access_key', 'secret_key', 'chunk_size', 'max_retries', 'compress', 'server_side_encryption'];
            json.settings = this.getSettings(s3Settings);
        }
        return JSON.stringify(json);
    };

    this.validate=function() {
        if (!notEmpty(this.name)) {
            throw "Repository name is required";
        }
        if (!notEmpty(this.type)) {
            throw "Repository type is required";
        }
        if (this.type === 'fs') {
            var fsRequired = ['location'];
            this.validateSettings(fsRequired);
        }
        if (this.type === 'url') {
            var urlRequired = ['url'];
            this.validateSettings(urlRequired);
        }
        if (this.type === 's3') {
            var s3Required = ['bucket'];
            this.validateSettings(s3Required);
        }
    };

    this.validateSettings=function(required) {
        var repository = this;
        required.forEach(function(setting) {
            if (!notEmpty(repository.settings[setting])) {
                throw(setting + " is required for repositories of type " + repository.type);
            }
        });
    };

    this.getSettings=function(availableSettings) {
        var settings = {};
        var currentSettings = this.settings;
        availableSettings.forEach(function(setting) {
            if (notEmpty(currentSettings[setting])) {
                settings[setting] = currentSettings[setting];
            }
        });
        return settings;
    };
}