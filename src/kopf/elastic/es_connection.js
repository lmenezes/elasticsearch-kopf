// Expects URL according to /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
// Examples:
// http://localhost:9200
// http://user:password@localhost:9200
// https://localhost:9200
function ESConnection(url, with_credentials) {
	var protected_url = /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
	this.host = "http://localhost:9200"; // default
    this.with_credentials = with_credentials;
	if (notEmpty(url)) {
		var connection_parts = protected_url.exec(url);
		if (isDefined(connection_parts)) {
			this.host = connection_parts[1] + "://" + connection_parts[4];
			this.username = connection_parts[2];
			this.password = connection_parts[3];
		} else {
			this.host = url;
		}		
	}
}