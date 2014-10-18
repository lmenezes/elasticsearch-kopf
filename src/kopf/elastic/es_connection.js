// Expects URL according to /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
// Examples:
// http://localhost:9200
// http://user:password@localhost:9200
// https://localhost:9200
function ESConnection(url, withCredentials) {
  var protectedUrl = /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
  this.host = 'http://localhost:9200'; // default
  this.with_credentials = withCredentials;
  if (notEmpty(url)) {
    var connectionParts = protectedUrl.exec(url);
    if (isDefined(connectionParts)) {
      this.host = connectionParts[1] + '://' + connectionParts[4];
      this.username = connectionParts[2];
      this.password = connectionParts[3];
    } else {
      this.host = url;
    }
  }
}
