function readablizeBytes(bytes) {
	if (bytes > 0) {
		var s = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];
		var e = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, e)).toFixed(2) + s[e];	
	} else {
		return 0;
	}
};

// Gets the value of a nested property from an object if it exists.
// Otherwise returns the default_value given
// Example: get the value of object[a][b][c][d]
// where property_path is [a,b,c,d]
function getProperty(object, property_path, default_value) {
	var value = default_value;
	if (isDefined(object[property_path])) {
		return object[property_path];
	}
	var path_parts = property_path.split('.');
	var ref = object;
	for (var i = 0; i < path_parts.length; i++) {
		var property = path_parts[i];
		if (isDefined(ref[property])) {
			ref = ref[property];
		} else {
			ref = null;
			break;
		}
	}
	if (isDefined(ref)) {
		value = ref;
	}
	return value;
}

function isDefined(value) {
	return value !== null && typeof value != 'undefined';
}

function notEmpty(value) {
	return isDefined(value) && value.trim().length > 0;
}