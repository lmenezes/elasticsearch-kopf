function NodeHotThreads(data) {
  var lines = data.split('\n');
  this.header = lines[0];
  this.subHeader = lines[1];
  this.node = this.header.substring(
      this.header.indexOf('[') + 1,
      this.header.indexOf(']')
  );
  var threads = [];
  var thread;
  if (lines.length > 3) {
    lines.slice(3).forEach(function(line) {
      if (line.indexOf('       ') === 0) {
        thread.stack.push(line);
      } else if (line.indexOf('     ') === 0) {
        thread.subHeader = line;
      }
      else if (line.indexOf('    ') === 0) {
        thread = new HotThread(line);
        threads.push(thread);
      }
    });
  }
  this.threads = threads;

}
