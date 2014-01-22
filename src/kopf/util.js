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
	if (property_path instanceof Array) {
		var ref = object;
		property_path.forEach(function(property) {
			if (isDefined(ref[property])) {
				ref = ref[property];
			} // could break earlier, but is it worth it?
		});
		value = ref;
	}
	return value;
}