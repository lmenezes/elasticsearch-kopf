kopf.filter('timeInterval', function() {

  var UNITS = ['year', 'month', 'day', 'hour', 'minute'];

  var UNIT_MEASURE = {
    year: 31536000,
    month: 2678400,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  function stringify(seconds) {

    var result = 'less than a minute';

    function format(number, unit) {
      var caption = ' ' + unit + ((number > 1) ? 's' : '');
      return number + caption;
    }

    for (var idx = 0; idx < UNITS.length; idx++) {
      var amount = Math.floor(seconds / UNIT_MEASURE[UNITS[idx]]);
      if (amount) {
        result = format(amount, UNITS[idx]);
        break;
      }
    }

    return result;
  }

  return function(seconds) {
    return stringify(seconds);
  };

});
