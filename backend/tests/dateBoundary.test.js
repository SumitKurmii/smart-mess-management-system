const { DateTime } = require('luxon');
const {
  calculateMealCutoffInstant,
  isBookingAllowed,
  toOperationalDateString,
  getCurrentOperationalDate
} = require('../src/utils/dateUtils');

describe('Timezone & Cutoff Boundary Tests (Zone: Asia/Kolkata)', () => {
  const ZONE = 'Asia/Kolkata';

  describe('Breakfast Cutoff Boundaries (22:00:00 IST on Previous Day)', () => {
    const mealDate = '2026-10-10';

    it('should compute exact cutoff instant for breakfast on previous calendar day', () => {
      const cutoff = calculateMealCutoffInstant(mealDate, 'breakfast', {}, ZONE);
      expect(cutoff.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2026-10-09 22:00:00');
    });

    it('should ALLOW booking exactly 1 second before cutoff (21:59:59 IST)', () => {
      const current = DateTime.fromISO('2026-10-09T21:59:59.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'breakfast', current, {}, ZONE);
      expect(result.allowed).toBe(true);
    });

    it('should REJECT booking exactly AT the cutoff instant (22:00:00 IST)', () => {
      const current = DateTime.fromISO('2026-10-09T22:00:00.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'breakfast', current, {}, ZONE);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Booking deadline passed');
    });

    it('should REJECT booking exactly 1 second after cutoff (22:00:01 IST)', () => {
      const current = DateTime.fromISO('2026-10-09T22:00:01.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'breakfast', current, {}, ZONE);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Booking deadline passed');
    });
  });

  describe('Lunch Cutoff Boundaries (09:00:00 IST on Same Day)', () => {
    const mealDate = '2026-10-10';

    it('should compute exact cutoff instant for lunch on same day morning', () => {
      const cutoff = calculateMealCutoffInstant(mealDate, 'lunch', {}, ZONE);
      expect(cutoff.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2026-10-10 09:00:00');
    });

    it('should ALLOW booking 1 second before cutoff (08:59:59 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T08:59:59.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'lunch', current, {}, ZONE);
      expect(result.allowed).toBe(true);
    });

    it('should ALLOW booking 1 millisecond before cutoff (08:59:59.999 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T08:59:59.999', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'lunch', current, {}, ZONE);
      expect(result.allowed).toBe(true);
    });

    it('should REJECT booking exactly AT cutoff (09:00:00.000 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T09:00:00.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'lunch', current, {}, ZONE);
      expect(result.allowed).toBe(false);
    });

    it('should REJECT booking 1 millisecond after cutoff (09:00:00.001 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T09:00:00.001', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'lunch', current, {}, ZONE);
      expect(result.allowed).toBe(false);
    });

    it('should REJECT booking 1 second after cutoff (09:00:01 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T09:00:01.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'lunch', current, {}, ZONE);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Dinner Cutoff Boundaries (16:00:00 IST on Same Day)', () => {
    const mealDate = '2026-10-10';

    it('should compute exact cutoff instant for dinner on same day afternoon', () => {
      const cutoff = calculateMealCutoffInstant(mealDate, 'dinner', {}, ZONE);
      expect(cutoff.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2026-10-10 16:00:00');
    });

    it('should ALLOW booking 1 second before cutoff (15:59:59 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T15:59:59.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'dinner', current, {}, ZONE);
      expect(result.allowed).toBe(true);
    });

    it('should REJECT booking exactly AT cutoff (16:00:00 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T16:00:00.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'dinner', current, {}, ZONE);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Booking deadline passed');
    });

    it('should REJECT booking 1 second after cutoff (16:00:01 IST)', () => {
      const current = DateTime.fromISO('2026-10-10T16:00:01.000', { zone: ZONE }).toJSDate();
      const result = isBookingAllowed(mealDate, 'dinner', current, {}, ZONE);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Booking deadline passed');
    });
  });

  describe('Month and Year Rollover Boundaries', () => {
    it('should correctly handle New Year rollover (Jan 1 meal cutoff on Dec 31 night)', () => {
      const mealDate = '2027-01-01';
      const cutoff = calculateMealCutoffInstant(mealDate, 'breakfast', {}, ZONE);
      expect(cutoff.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2026-12-31 22:00:00');

      const beforeNewYear = DateTime.fromISO('2026-12-31T21:45:00.000', { zone: ZONE }).toJSDate();
      expect(isBookingAllowed(mealDate, 'breakfast', beforeNewYear, {}, ZONE).allowed).toBe(true);

      const afterNewYear = DateTime.fromISO('2027-01-01T00:01:00.000', { zone: ZONE }).toJSDate();
      expect(isBookingAllowed(mealDate, 'breakfast', afterNewYear, {}, ZONE).allowed).toBe(false);
    });

    it('should correctly handle Month rollover (Nov 1 meal cutoff on Oct 31 night)', () => {
      const mealDate = '2026-11-01';
      const cutoff = calculateMealCutoffInstant(mealDate, 'breakfast', {}, ZONE);
      expect(cutoff.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2026-10-31 22:00:00');
    });
  });

  describe('Canonical Date Formatting', () => {
    it('should convert an ISO timestamp in UTC to correct operational date in Asia/Kolkata', () => {
      // 2026-10-09 19:00:00 UTC is 2026-10-10 00:30:00 IST (UTC+5:30)
      const utcInstant = '2026-10-09T19:00:00.000Z';
      const operationalDate = toOperationalDateString(utcInstant, ZONE);
      expect(operationalDate).toBe('2026-10-10');
    });
  });
});
