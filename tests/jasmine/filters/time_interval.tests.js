describe('filter', function() {

  beforeEach(module('kopf'));

  describe('timeInterval', function() {

    it('should convert boolean values to unicode checkmark or cross',
        inject(function(timeIntervalFilter) {
          expect(timeIntervalFilter(100000)).toBe('1 minute');
          expect(timeIntervalFilter(1000000)).toBe('16 minutes');
          expect(timeIntervalFilter(10000000)).toBe('2 hours');
          expect(timeIntervalFilter(100000000)).toBe('1 day');
          expect(timeIntervalFilter(1000000000)).toBe('11 days');
          expect(timeIntervalFilter(10000000000)).toBe('3 months');
          expect(timeIntervalFilter(100000000000)).toBe('3 years');
        }));
  });
});