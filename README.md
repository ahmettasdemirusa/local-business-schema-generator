<div align="center">

# 📍 Local Business Schema Generator

**Build LocalBusiness JSON-LD for local SEO, validated against Google's structured data guidelines as you type.**

Free · open source · no sign-up · runs entirely in your browser

[![Live demo](https://img.shields.io/badge/▶_Live_demo-open_the_generator-1a73e8?style=for-the-badge)](https://ahmettasdemirusa.github.io/local-business-schema-generator/)

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![Tests](https://img.shields.io/badge/tests-node_--test-blue)

![Local Business Schema Generator](docs/screenshot.png)

</div>

---

## Why

Search engines read **structured data** to understand a local business: what it is, where it is, when it is open and how to reach it. Most generators either hide it behind a sign-up or produce markup that Google quietly ignores: missing address fields, imprecise coordinates, or self-serving review stars that never show.

This tool writes the markup **and** tells you what is wrong with it, before you paste it into your site.

## Features

- **50+ business types**: restaurants, cafes, plumbers, HVAC, roofers, dentists, clinics, law firms, real estate, salons, gyms, auto repair, stores, hotels and more
- **Live validation** in three levels:
  - **errors**: Google can't use the markup
  - **warnings**: you lose a feature or a signal
  - **tips**: good practice
- **Opening hours editor**: closed days and 24-hour days use Google's conventions, and days with the same hours are grouped automatically
- **Restaurant fields** appear only for food businesses: `servesCuisine`, `menu`, `acceptsReservations`
- **Profiles and service areas**: `sameAs` links (Google Business Profile, Facebook, Instagram, Yelp) and `areaServed` cities
- **Share link**: the whole form is encoded in the URL, so you can send a draft to a client or a colleague
- **Private by design**: nothing leaves your browser; your last draft is kept in `localStorage`
- **Zero dependencies**: four static files, works offline, host it anywhere

## What it checks

| Check | Level |
|---|---|
| `name` and `address` present (Google's required properties) | error |
| Missing street, city, region, postal code or country | warning |
| URL is a valid `http(s)://` address; prefers `https` | error / tip |
| Telephone present; includes a country code | warning / tip |
| Latitude and longitude in range, with **at least 5 decimal places** | error / warning |
| `priceRange` shorter than 100 characters | warning |
| Opening and closing times are valid `HH:MM`, not identical | error / warning |
| Image, logo, map and profile links are full URLs | warning |
| Restaurants: cuisine and menu present; reservations value is yes, no or a URL | tip / warning |
| User text cannot break out of the `<script>` tag | always escaped |

Always confirm the final result with Google's [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema.org Validator](https://validator.schema.org/).

## Use it

**Online:** open the [live demo](https://ahmettasdemirusa.github.io/local-business-schema-generator/), fill in the form, click **Copy** and paste the snippet into the `<head>` of the business's page.

**Locally:**

```bash
git clone https://github.com/ahmettasdemirusa/local-business-schema-generator.git
cd local-business-schema-generator
python -m http.server 8000   # or any static server
```

**In your own code:** `schema.js` has no DOM access and works in Node and in the browser:

```js
const LocalSchema = require('./schema.js');

const state = LocalSchema.exampleState();   // or build your own from defaultState()
state.name = 'Acme Plumbing';
state.type = 'Plumber';

const jsonLd = LocalSchema.build(state);        // plain object
const problems = LocalSchema.validate(state);   // [{ level, field, message }]
const html = LocalSchema.scriptTag(jsonLd);      // ready-to-paste <script> block
```

## Local SEO tips

- **Don't mark up reviews of your own business.** Google does not show review stars for a local business that marks up reviews about itself.
- **Keep name, address and phone identical** on your site, your Google Business Profile and your directory listings.
- **One location, one page.** A business with several locations should give each one its own page and its own JSON-LD block.

## Development

```bash
node --test
```

| File | Purpose |
|---|---|
| `schema.js` | Builds and validates the JSON-LD. Pure logic, shared by the UI and the tests |
| `app.js` | Form, hours editor, live preview, share link |
| `index.html`, `style.css` | The page; light and dark themes follow the system setting |
| `test/` | Unit tests (`node --test`, no packages needed) |

Contributions are welcome. New business types, new checks and translations make especially good first pull requests. Please add a test with any new check.

## License

[MIT](LICENSE) © Ahmet Tasdemir

---

<div align="center">

If this saved you time, a ⭐ helps other people find it.

Built by **[Ahmet Tasdemir](https://github.com/ahmettasdemirusa)**, software engineer · [ahmettasdemir.com](https://ahmettasdemir.com)

</div>
