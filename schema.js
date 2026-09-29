/*
 * Local Business Schema Generator: core logic.
 *
 * Builds LocalBusiness JSON-LD from a plain form state and checks it against
 * Google's structured data guidelines. No DOM access here, so the same file
 * runs in the browser (window.LocalSchema) and in Node (require('./schema.js')).
 *
 * MIT License, Ahmet Tasdemir.
 */
(function (root) {
  'use strict';

  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // schema.org types grouped for the picker. `food` enables the restaurant fields
  // (servesCuisine, menu, acceptsReservations), which only exist on FoodEstablishment.
  var TYPE_GROUPS = [
    { label: 'General', types: [['LocalBusiness', 'Local business (generic)'], ['ProfessionalService', 'Professional service']] },
    { label: 'Food & drink', food: true, types: [
      ['Restaurant', 'Restaurant'], ['FastFoodRestaurant', 'Fast food restaurant'], ['CafeOrCoffeeShop', 'Cafe or coffee shop'],
      ['Bakery', 'Bakery'], ['BarOrPub', 'Bar or pub'], ['IceCreamShop', 'Ice cream shop'], ['Winery', 'Winery'], ['Brewery', 'Brewery']] },
    { label: 'Home services & trades', types: [
      ['Plumber', 'Plumber'], ['Electrician', 'Electrician'], ['HVACBusiness', 'HVAC'], ['RoofingContractor', 'Roofing contractor'],
      ['GeneralContractor', 'General contractor'], ['HousePainter', 'House painter'], ['Locksmith', 'Locksmith'],
      ['MovingCompany', 'Moving company'], ['HomeAndConstructionBusiness', 'Home & construction (other)']] },
    { label: 'Health & medical', types: [
      ['Dentist', 'Dentist'], ['Physician', 'Physician'], ['MedicalClinic', 'Medical clinic'], ['Optician', 'Optician'],
      ['Pharmacy', 'Pharmacy'], ['VeterinaryCare', 'Veterinary care']] },
    { label: 'Legal, finance & real estate', types: [
      ['LegalService', 'Law firm / attorney'], ['AccountingService', 'Accounting service'], ['InsuranceAgency', 'Insurance agency'],
      ['FinancialService', 'Financial service'], ['RealEstateAgent', 'Real estate agent']] },
    { label: 'Beauty & fitness', types: [
      ['BeautySalon', 'Beauty salon'], ['HairSalon', 'Hair salon'], ['NailSalon', 'Nail salon'], ['DaySpa', 'Day spa'],
      ['HealthClub', 'Health club'], ['ExerciseGym', 'Gym']] },
    { label: 'Automotive', types: [
      ['AutoRepair', 'Auto repair'], ['AutoBodyShop', 'Auto body shop'], ['AutoDealer', 'Auto dealer'], ['AutoWash', 'Car wash']] },
    { label: 'Retail', types: [
      ['Store', 'Store (generic)'], ['ClothingStore', 'Clothing store'], ['FurnitureStore', 'Furniture store'],
      ['HomeGoodsStore', 'Home goods store'], ['HardwareStore', 'Hardware store'], ['JewelryStore', 'Jewelry store'], ['Florist', 'Florist']] },
    { label: 'Lodging & care', types: [
      ['Hotel', 'Hotel'], ['Motel', 'Motel'], ['BedAndBreakfast', 'Bed and breakfast'], ['ChildCare', 'Child care']] }
  ];

  var FOOD_TYPES = {};
  TYPE_GROUPS.forEach(function (g) {
    if (g.food) g.types.forEach(function (t) { FOOD_TYPES[t[0]] = true; });
  });

  function isFood(type) { return !!FOOD_TYPES[type]; }

  // Types in the picker that schema.org does not place under LocalBusiness.
  // Google accepts several types as an array, so they are emitted together with
  // LocalBusiness to stay eligible for local business features.
  var NOT_LOCAL_BUSINESS = { VeterinaryCare: true };

  function typeValue(type) {
    type = type || 'LocalBusiness';
    return NOT_LOCAL_BUSINESS[type] ? [type, 'LocalBusiness'] : type;
  }

  function defaultState() {
    var hours = {};
    DAYS.forEach(function (d, i) {
      hours[d] = i < 5 ? { mode: 'open', opens: '09:00', closes: '17:00' } : { mode: 'closed', opens: '', closes: '' };
    });
    return {
      type: 'LocalBusiness', name: '', description: '', url: '', telephone: '', email: '',
      images: '', logo: '', priceRange: '',
      street: '', city: '', region: '', postal: '', country: 'US',
      lat: '', lng: '', hasMap: '',
      includeHours: true, hours: hours,
      sameAs: '', areaServed: '',
      cuisine: '', menu: '', reservations: ''
    };
  }

  function exampleState() {
    var s = defaultState();
    s.type = 'Restaurant';
    s.name = 'Example Brick Oven Pizza';
    s.description = 'Neighborhood pizzeria serving wood-fired New York style pies, salads and calzones.';
    s.url = 'https://www.example.com/';
    s.telephone = '+1-555-010-0199';
    s.images = 'https://www.example.com/photos/storefront.jpg\nhttps://www.example.com/photos/margherita.jpg';
    s.logo = 'https://www.example.com/logo.png';
    s.priceRange = '$$';
    s.street = '123 Main Street, Suite 4';
    s.city = 'Springfield';
    s.region = 'IL';
    s.postal = '62701';
    s.country = 'US';
    s.lat = '39.78172';
    s.lng = '-89.65015';
    DAYS.forEach(function (d) { s.hours[d] = { mode: 'open', opens: '11:00', closes: '22:00' }; });
    s.hours.Friday = { mode: 'open', opens: '11:00', closes: '23:30' };
    s.hours.Saturday = { mode: 'open', opens: '11:00', closes: '23:30' };
    s.hours.Monday = { mode: 'closed', opens: '', closes: '' };
    s.sameAs = 'https://www.facebook.com/example\nhttps://www.instagram.com/example';
    s.cuisine = 'Pizza, Italian';
    s.menu = 'https://www.example.com/menu/';
    s.reservations = 'false';
    return s;
  }

  function lines(text) {
    return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function list(text) {
    return String(text || '').split(/[,\n]/).map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function isUrl(v) { return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(v); }

  function isTime(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(v); }

  function decimals(v) {
    var m = String(v).trim().match(/\.(\d+)$/);
    return m ? m[1].length : 0;
  }

  function oneOrMany(arr) { return arr.length === 1 ? arr[0] : arr; }

  // Consecutive or not, days with identical hours share one specification,
  // which keeps the output short and readable.
  function hoursSpec(hours) {
    var groups = [];
    var byKey = {};
    DAYS.forEach(function (day) {
      var h = hours[day] || { mode: 'closed' };
      var opens, closes;
      if (h.mode === 'closed') { opens = '00:00'; closes = '00:00'; }
      else if (h.mode === '24h') { opens = '00:00'; closes = '23:59'; }
      else { opens = h.opens; closes = h.closes; }
      if (!opens || !closes) return;
      var key = opens + '-' + closes;
      if (!byKey[key]) {
        byKey[key] = { '@type': 'OpeningHoursSpecification', dayOfWeek: [], opens: opens, closes: closes };
        groups.push(byKey[key]);
      }
      byKey[key].dayOfWeek.push(day);
    });
    return groups.map(function (g) {
      return { '@type': g['@type'], dayOfWeek: oneOrMany(g.dayOfWeek), opens: g.opens, closes: g.closes };
    });
  }

  function build(s) {
    var o = { '@context': 'https://schema.org', '@type': typeValue(s.type) };
    var url = String(s.url || '').trim();
    if (url) o['@id'] = url.replace(/#.*$/, '') + '#business';
    if (s.name.trim()) o.name = s.name.trim();
    if (s.description.trim()) o.description = s.description.trim();
    if (url) o.url = url;
    if (s.telephone.trim()) o.telephone = s.telephone.trim();
    if (s.email.trim()) o.email = s.email.trim();
    var images = lines(s.images);
    if (images.length) o.image = oneOrMany(images);
    if (s.logo.trim()) o.logo = s.logo.trim();
    if (s.priceRange.trim()) o.priceRange = s.priceRange.trim();

    var addr = { '@type': 'PostalAddress' };
    [['street', 'streetAddress'], ['city', 'addressLocality'], ['region', 'addressRegion'],
      ['postal', 'postalCode'], ['country', 'addressCountry']].forEach(function (p) {
      var v = String(s[p[0]] || '').trim();
      if (v) addr[p[1]] = v;
    });
    if (Object.keys(addr).length > 1) o.address = addr;

    var lat = parseFloat(s.lat), lng = parseFloat(s.lng);
    if (String(s.lat).trim() && String(s.lng).trim() && isFinite(lat) && isFinite(lng)) {
      o.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
    }
    if (s.hasMap.trim()) o.hasMap = s.hasMap.trim();

    if (s.includeHours) {
      var spec = hoursSpec(s.hours || {});
      if (spec.length) o.openingHoursSpecification = spec;
    }

    var same = lines(s.sameAs);
    if (same.length) o.sameAs = oneOrMany(same);

    var areas = list(s.areaServed);
    if (areas.length) {
      o.areaServed = oneOrMany(areas.map(function (a) { return { '@type': 'City', name: a }; }));
    }

    if (isFood(s.type)) {
      var cuisine = list(s.cuisine);
      if (cuisine.length) o.servesCuisine = oneOrMany(cuisine);
      if (s.menu.trim()) o.menu = s.menu.trim();
      if (s.reservations === 'true') o.acceptsReservations = true;
      else if (s.reservations === 'false') o.acceptsReservations = false;
      else if (isUrl(String(s.reservations || '').trim())) o.acceptsReservations = s.reservations.trim();
    }
    return o;
  }

  // Each finding: { level: 'error' | 'warning' | 'tip', field, message }.
  // Errors stop Google from using the markup; warnings lose a feature or a signal;
  // tips are good practice.
  function validate(s) {
    var out = [];
    function add(level, field, message) { out.push({ level: level, field: field, message: message }); }

    if (!s.name.trim()) add('error', 'name', 'Business name is required.');

    var street = s.street.trim(), city = s.city.trim();
    if (!street && !city) {
      add('error', 'street', 'Address is required. Add at least the street address and city.');
    } else {
      if (!street) add('warning', 'street', 'Add the street address; Google asks for as many address properties as possible.');
      if (!city) add('warning', 'city', 'Add the city (addressLocality).');
      if (!s.region.trim()) add('warning', 'region', 'Add the state or region (addressRegion).');
      if (!s.postal.trim()) add('warning', 'postal', 'Add the postal code.');
      if (!s.country.trim()) add('warning', 'country', 'Add the country, as a two-letter ISO code such as US.');
    }
    if (s.country.trim() && !/^[A-Za-z]{2}$/.test(s.country.trim())) {
      add('tip', 'country', 'Use the two-letter ISO 3166-1 country code, e.g. "US" or "GB".');
    }

    var url = s.url.trim();
    if (!url) add('warning', 'url', 'Add the URL of the business’s own page.');
    else if (!isUrl(url)) add('error', 'url', 'URL must start with http:// or https://.');
    else if (!/^https:/i.test(url)) add('tip', 'url', 'Use the https:// version of the URL.');

    var tel = s.telephone.trim();
    if (!tel) add('warning', 'telephone', 'Add a telephone number; it is a recommended property.');
    else if (tel.charAt(0) !== '+') add('tip', 'telephone', 'Include the country code, e.g. +1-555-010-0199.');

    if (s.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) add('warning', 'email', 'Email address looks invalid.');

    var latS = String(s.lat).trim(), lngS = String(s.lng).trim();
    if (latS || lngS) {
      var lat = parseFloat(latS), lng = parseFloat(lngS);
      if (!latS || !lngS) add('warning', latS ? 'lng' : 'lat', 'Provide both latitude and longitude, or neither.');
      else if (!isFinite(lat) || lat < -90 || lat > 90) add('error', 'lat', 'Latitude must be a number between -90 and 90.');
      else if (!isFinite(lng) || lng < -180 || lng > 180) add('error', 'lng', 'Longitude must be a number between -180 and 180.');
      else if (decimals(latS) < 5 || decimals(lngS) < 5) add('warning', 'lat', 'Use at least 5 decimal places for latitude and longitude.');
    } else {
      add('tip', 'lat', 'Add geo coordinates (latitude and longitude) for the exact location.');
    }

    if (s.priceRange.trim().length >= 100) add('warning', 'priceRange', 'Keep priceRange shorter than 100 characters, or Google won’t show it.');

    lines(s.images).forEach(function (u) { if (!isUrl(u)) add('warning', 'images', 'Image is not a valid URL: ' + u); });
    if (!lines(s.images).length) add('tip', 'images', 'Add at least one photo of the business.');
    if (s.logo.trim() && !isUrl(s.logo.trim())) add('warning', 'logo', 'Logo must be a full URL.');
    if (s.hasMap.trim() && !isUrl(s.hasMap.trim())) add('warning', 'hasMap', 'Map link must be a full URL.');
    lines(s.sameAs).forEach(function (u) { if (!isUrl(u)) add('warning', 'sameAs', 'Profile link is not a valid URL: ' + u); });

    if (s.includeHours) {
      DAYS.forEach(function (d) {
        var h = (s.hours || {})[d];
        if (!h || h.mode !== 'open') return;
        if (!isTime(h.opens) || !isTime(h.closes)) add('error', 'hours', d + ': enter opening and closing times as HH:MM.');
        else if (h.opens === h.closes) add('warning', 'hours', d + ': opening and closing times are the same. Mark the day Closed or Open 24 hours instead.');
      });
    } else {
      add('tip', 'hours', 'Opening hours are recommended. Leave them out only if they really vary.');
    }

    if (isFood(s.type)) {
      if (!list(s.cuisine).length) add('tip', 'cuisine', 'Add servesCuisine, e.g. "Pizza, Italian".');
      if (!s.menu.trim()) add('tip', 'menu', 'Add the URL of the menu.');
      else if (!isUrl(s.menu.trim())) add('warning', 'menu', 'Menu must be a full URL.');
      var r = String(s.reservations || '').trim();
      if (r && r !== 'true' && r !== 'false' && !isUrl(r)) add('warning', 'reservations', 'acceptsReservations must be yes, no, or a booking URL.');
    }

    return out;
  }

  function scriptTag(obj) {
    return '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/') + '\n</script>';
  }

  var api = {
    DAYS: DAYS, TYPE_GROUPS: TYPE_GROUPS, isFood: isFood,
    defaultState: defaultState, exampleState: exampleState,
    build: build, validate: validate, scriptTag: scriptTag
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LocalSchema = api;
})(this);
