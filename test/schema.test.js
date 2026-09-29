// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const S = require('../schema.js');

const levels = (s, level) => S.validate(s).filter((f) => f.level === level);

test('empty form reports the two required properties', () => {
  const errors = levels(S.defaultState(), 'error').map((f) => f.field);
  assert.deepStrictEqual(errors.sort(), ['name', 'street']);
});

test('example state is valid and complete', () => {
  const s = S.exampleState();
  assert.strictEqual(levels(s, 'error').length, 0);
  assert.strictEqual(levels(s, 'warning').length, 0);
  const o = S.build(s);
  assert.strictEqual(o['@type'], 'Restaurant');
  assert.strictEqual(o['@id'], 'https://www.example.com/#business');
  assert.strictEqual(o.address.addressCountry, 'US');
  assert.deepStrictEqual(o.servesCuisine, ['Pizza', 'Italian']);
  assert.strictEqual(o.acceptsReservations, false);
  assert.strictEqual(o.geo.latitude, 39.78172);
});

test('days with identical hours are grouped; closed and 24h use Google\'s conventions', () => {
  const s = S.defaultState();
  s.name = 'X'; s.street = '1 A St'; s.city = 'B';
  s.hours.Saturday = { mode: '24h', opens: '', closes: '' };
  const spec = S.build(s).openingHoursSpecification;
  assert.deepStrictEqual(spec, [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '00:00', closes: '23:59' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '00:00', closes: '00:00' }
  ]);
});

test('hours can be left out entirely', () => {
  const s = S.defaultState();
  s.includeHours = false;
  assert.strictEqual(S.build(s).openingHoursSpecification, undefined);
});

test('restaurant-only properties never leak onto other types', () => {
  const s = S.exampleState();
  s.type = 'Plumber';
  const o = S.build(s);
  assert.strictEqual(o.servesCuisine, undefined);
  assert.strictEqual(o.menu, undefined);
  assert.strictEqual(o.acceptsReservations, undefined);
});

test('geo precision, priceRange length and URL checks', () => {
  const s = S.exampleState();
  s.lat = '39.78'; s.lng = '-89.65';
  s.priceRange = 'x'.repeat(100);
  s.url = 'example.com';
  const found = S.validate(s).map((f) => f.level + ':' + f.field);
  assert.ok(found.includes('warning:lat'));
  assert.ok(found.includes('warning:priceRange'));
  assert.ok(found.includes('error:url'));
});

test('invalid opening times are errors', () => {
  const s = S.exampleState();
  s.hours.Tuesday = { mode: 'open', opens: '', closes: '17:00' };
  assert.ok(levels(s, 'error').some((f) => f.field === 'hours'));
});

test('script tag cannot be broken out of by user text', () => {
  const s = S.exampleState();
  s.description = '</script><script>alert(1)</script>';
  const tag = S.scriptTag(S.build(s));
  assert.strictEqual(tag.match(/<\/script>/g).length, 1);
});

test('single values are not wrapped in arrays', () => {
  const s = S.exampleState();
  s.images = 'https://www.example.com/one.jpg';
  s.sameAs = 'https://www.facebook.com/example';
  const o = S.build(s);
  assert.strictEqual(o.image, 'https://www.example.com/one.jpg');
  assert.strictEqual(o.sameAs, 'https://www.facebook.com/example');
});
