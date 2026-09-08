/* Mock users + data seeder (Postgres / Prisma).
 *
 * Adds 30 realistic test users straight into the database (bypassing the API),
 * all with the password Test@123, plus mock supply-side data:
 *   - every seller / dealer user gets 2 properties, each with its own DISTINCT
 *     photo set (no image is reused across properties — asserted below),
 *   - every property is wrapped in a Listing so it shows on My Listings,
 *   - the buyer users get requirements tuned to match several properties,
 *   - matches are created from those genuine overlaps.
 *
 * Run with:
 *   cd Backend && node mock-users-seed.js
 *
 * Idempotent — re-running deletes the same mock emails (cascading their data)
 * and reseeds. Uses a dedicated @apnabnb.mock domain so it never collides with
 * full-seed.js (@apnabnb.seed) or demo-seed.js (@apnabnb.test).
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./db/prisma');
const { toPropertyCreateData } = require('./utils/seedPropertyFields');

const PASS = 'Test@123';
const DOMAIN = '@apnabnb.mock';

const PEOPLE = [
  { key: 'ali',    name: 'Ali Raza',        role: 'seller', phone: '+92 300 1234501', location: 'Gulberg III, Lahore',       latitude: 31.5204, longitude: 74.3587 },
  { key: 'ayesha', name: 'Ayesha Siddiqui', role: 'buyer',  phone: '+92 301 1234502', location: 'Clifton, Karachi',         latitude: 24.8138, longitude: 67.0300 },
  { key: 'hamza',  name: 'Hamza Farooq',    role: 'dealer', phone: '+92 321 1234503', location: 'F-8, Islamabad',            latitude: 33.7005, longitude: 73.0553 },
  { key: 'maria',  name: 'Maria Khan',      role: 'seller', phone: '+92 333 1234504', location: 'Bahria Town, Rawalpindi',   latitude: 33.5651, longitude: 73.0169 },
  { key: 'owais',  name: 'Owais Sheikh',    role: 'buyer',  phone: '+92 345 1234505', location: 'Mills Road, Faisalabad',    latitude: 31.4504, longitude: 73.1350 },
  { key: 'zara',   name: 'Zara Malik',      role: 'dealer', phone: '+92 311 1234506', location: 'DHA Phase 5, Lahore',       latitude: 31.4697, longitude: 74.4131 },
  { key: 'shahid', name: 'Shahid Mehmood',  role: 'seller', phone: '+92 302 1234507', location: 'Gulgasht, Multan',          latitude: 30.1984, longitude: 71.4687 },
  { key: 'hira',   name: 'Hira Aslam',      role: 'buyer',  phone: '+92 334 1234508', location: 'DHA Phase 6, Karachi',      latitude: 24.8008, longitude: 67.0691 },
  { key: 'imran',  name: 'Imran Qureshi',   role: 'dealer', phone: '+92 341 1234509', location: 'University Town, Peshawar', latitude: 34.0151, longitude: 71.5249 },
  { key: 'nimra',  name: 'Nimra Gill',      role: 'seller', phone: '+92 349 1234510', location: 'F-11 Markaz, Islamabad',    latitude: 33.6844, longitude: 72.9992 },
  { key: 'raheel',   name: 'Raheel Anwar',   role: 'seller', phone: '+92 300 1234511', location: 'Cantt, Lahore',              latitude: 31.5128, longitude: 74.3382 },
  { key: 'asma',     name: 'Asma Javed',     role: 'dealer', phone: '+92 301 1234512', location: 'G-11, Islamabad',            latitude: 33.6683, longitude: 72.9903 },
  { key: 'danish',   name: 'Danish Ahmed',   role: 'seller', phone: '+92 321 1234513', location: 'Gulshan-e-Iqbal, Karachi',   latitude: 24.9100, longitude: 67.1000 },
  { key: 'saima',    name: 'Saima Yousuf',   role: 'dealer', phone: '+92 333 1234514', location: 'Satiana Road, Faisalabad',  latitude: 31.4180, longitude: 73.0720 },
  { key: 'noman',    name: 'Noman Baig',     role: 'seller', phone: '+92 345 1234515', location: 'Satellite Town, Rawalpindi', latitude: 33.5973, longitude: 73.0433 },
  { key: 'saad',     name: 'Saad Qureshi',   role: 'seller', phone: '+92 311 1234516', location: 'Cantt, Gujranwala',           latitude: 32.1551, longitude: 74.1857 },
  { key: 'nadia',    name: 'Nadia Tariq',    role: 'dealer', phone: '+92 302 1234517', location: 'Cantt, Sialkot',             latitude: 32.4945, longitude: 74.5229 },
  { key: 'tariq',    name: 'Tariq Hussain',  role: 'seller', phone: '+92 334 1234518', location: 'Latifabad, Hyderabad',       latitude: 25.3960, longitude: 68.3570 },
  { key: 'amna',     name: 'Amna Riaz',      role: 'seller', phone: '+92 341 1234519', location: 'Walton Road, Sahiwal',       latitude: 30.6650, longitude: 73.1010 },
  { key: 'faisal',   name: 'Faisal Magsi',   role: 'dealer', phone: '+92 349 1234520', location: 'Zarghoon Road, Quetta',      latitude: 30.1798, longitude: 66.9750 },
  { key: 'tooba',    name: 'Tooba Ishaq',    role: 'dealer', phone: '+92 300 1234521', location: 'E-11, Islamabad',            latitude: 33.6560, longitude: 72.9440 },
  { key: 'kamran',   name: 'Kamran Abbas',   role: 'seller', phone: '+92 301 1234522', location: 'Model Town, Lahore',         latitude: 31.4805, longitude: 74.3239 },
  { key: 'azhar',    name: 'Azhar Chaudhry', role: 'seller', phone: '+92 321 1234523', location: 'Depalpur Road, Okara',       latitude: 30.8090, longitude: 73.4470 },
  { key: 'saman',    name: 'Saman Anjam',    role: 'dealer', phone: '+92 333 1234524', location: 'Gulgasht, Multan',           latitude: 30.1984, longitude: 71.4687 },
  { key: 'erum',     name: 'Erum Shah',      role: 'buyer',  phone: '+92 345 1234525', location: 'Gulistan-e-Johar, Karachi',  latitude: 24.9052, longitude: 67.1117 },
  { key: 'rubab',    name: 'Rubab Fatima',   role: 'buyer',  phone: '+92 311 1234526', location: 'I-8, Islamabad',             latitude: 33.6695, longitude: 73.0330 },
  { key: 'bilawal',  name: 'Bilawal Marwat', role: 'buyer',  phone: '+92 302 1234527', location: 'Cantt, Lahore',              latitude: 31.5128, longitude: 74.3382 },
  { key: 'mahnoor',  name: 'Mahnoor Saleem', role: 'buyer',  phone: '+92 334 1234528', location: 'Westridge, Rawalpindi',      latitude: 33.6050, longitude: 73.0720 },
  { key: 'farhan',   name: 'Farhan Afzal',   role: 'buyer',  phone: '+92 341 1234529', location: 'D-Ground, Faisalabad',       latitude: 31.4400, longitude: 73.0980 },
  { key: 'zehra',    name: 'Zehra Naqvi',    role: 'buyer',  phone: '+92 349 1234530', location: 'Qasimabad, Hyderabad',       latitude: 25.3860, longitude: 68.3560 },
];

/* Distinct photo set per property — two exterior/interior shots each. Every id
   is unique across ALL properties; asserted before writing. */
const PHOTO_SETS = [
  ['photo-1564013799919-ab600027ffc6', 'photo-1600585154340-be6161a56a0c'],
  ['photo-1568605114967-8130f3a36994', 'photo-1600607687939-ce8a6c25118c'],
  ['photo-1580587771525-78b9dba3b914', 'photo-1605276374104-dee2a0ed3cd6'],
  ['photo-1600596542815-ffad4c1539a9', 'photo-1613490493576-7fde63acd811'],
  ['photo-1570129477492-45c003edd2be', 'photo-1600210492486-724fe5c67fb0'],
  ['photo-1512917774080-9991f1c4c750', 'photo-1522708323590-d24dbb6b0267'],
  ['photo-1600566753086-00f18fb6b3ea', 'photo-1502672260266-1c1ef2d93688'],
  ['photo-1600047509807-ba8f99d2cdde', 'photo-1493809842364-78817add7ffb'],
  ['photo-1449844908441-8829872d2607', 'photo-1502005229762-cf1b2da7c5d6'],
  ['photo-1523217582562-09d0def993a6', 'photo-1560185007-cde436f6a4d0'],
  ['photo-1576941089067-2de3c901e126', 'photo-1560184897-ae75f418493e'],
  ['photo-1583608205776-bfd35f0d9f83', 'photo-1560448075-bb485b067938'],
  ['photo-1592595896551-12b371d546d5', 'photo-1560440021-33f9b867899d'],
  ['photo-1494526585095-c41746248156', 'photo-1556912173-3bb406ef7e77'],
  ['photo-1502005097973-6a7082348e28', 'photo-1484154218962-a197022b5858'],
  ['photo-1416331108676-a22ccb276e35', 'photo-1556909212-d5b604d0c90d'],
  ['photo-1518780664697-55e3ad937233', 'photo-1600585152220-90363fe7e115'],
  ['photo-1600585153490-76fb20a32601', 'photo-1600566753376-12c8ab7fb75b'],
  ['photo-1497366216548-37526070297c', 'photo-1497366811353-6870744d04b2'],
  ['photo-1503387762-592deb58ef4e', 'photo-1554995207-c18c203602cb'],
  ['photo-1556228453-efd6c1ff04f6', 'photo-1502519144081-acca18599776'],
  ['photo-1522441815192-d9f04eb0615c', 'photo-1584646098378-0874589d76b1'],
  ['photo-1520250497591-112f2f40a3f4', 'photo-1448630360428-65456885c650'],
  ['photo-1521783988139-89397d761dce', 'photo-1545324418-cc1a3fa10c00'],
  ['photo-1531973576160-7125cd663d86', 'photo-1540569874015-1d9a2b345f46'],
  ['photo-1524229657812-6a8e30c5adfd', 'photo-1616594039964-ae9021a400a0'],
  ['photo-1616486338812-3dadae4b4ace', 'photo-1617806118233-18e1de247200'],
  ['photo-1600121848594-d8644e57abab', 'photo-1556911220-bff31c812dba'],
  ['photo-1556909114-f6e7ad7d3136', 'photo-1615873968403-89e068629265'],
  ['photo-1617104678098-de229db51175', 'photo-1600210835619-56e7fd0b96d0'],
  ['photo-1600011689032-8b628b8a8747', 'photo-1600011663292-8eefb7c61dbb'],
  ['photo-1582268611958-ebfd161ef9cf', 'photo-1551538827-9c037cb4f32a'],
  ['photo-1598928506311-c55ded91a20c', 'photo-1598928636135-d146006ff4be'],
  ['photo-1560185127-6ed189bf02f4', 'photo-1581417478175-a9ef5f557b56'],
  ['photo-1571508601891-ca5e7a713859', 'photo-1560448204-e02f11c3d0e2'],
  ['photo-1505691938895-1758d7feb511', 'photo-1522771739844-6a9f6d5f14af'],
  ['photo-1590490360182-c33d57733427', 'photo-1618221195710-dd6b41faaea6'],
  ['photo-1618220179428-22790b461013', 'photo-1600566753190-17f0baa2a6c3'],
  ['photo-1600573472550-8090b5e0745e', 'photo-1584738625991-3f0a8d5e0b34'],
  ['photo-1616137466211-f939a420be84', 'photo-1584622650111-993a426fbf0a'],
  ['photo-1493655161922-ef989dde9d96', 'photo-1493663284031-b7e3aefcae8e'],
  ['photo-1581858726788-75bc0f6a952d', 'photo-1599427303058-f04cbcf4756f'],
];
const img = (id) => `https://images.unsplash.com/${id}?w=1000&q=80&auto=format&fit=crop`;

/* Two properties per supplier (alias → seller/dealer users). Coordinates are
   real city/area centroids so map views render sensibly. */
const PROPERTIES = [
  { owner: 'ali',    title: '10 Marla House in Gulberg III',     city: 'Lahore',     area: 'Gulberg',            locality: 'Gulberg III', block: 'Block C', street: 'Main Boulevard', lat: 31.5204, lng: 74.3587, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 48000000, size: 10, unit: 'Marla',  bed: 4, bath: 4, status: 'active',   condition: 'good', facing: 'East', amenities: ['Parking', 'Security', 'Generator', 'Lawn', 'Drawing room', 'Servant quarter'] },
  { owner: 'ali',    title: '5 Marla Upper Portion, Johar Town', city: 'Lahore',     area: 'Johar Town',         locality: 'Phase 1', block: 'Block H', lat: 31.4697, lng: 74.2728, purpose: 'rent', category: 'home',       propertyType: 'upper-portion',      price: 65000,   size: 5,  unit: 'Marla',  bed: 2, bath: 2, status: 'active',   condition: 'like-new', amenities: ['Parking', 'Security', 'Balcony'], deposit: 130000, advanceRent: 65000, furnished: 'semi-furnished', leaseTerm: 12 },
  { owner: 'hamza',  title: '7 Marla House in F-8',              city: 'Islamabad',  area: 'F-8',                locality: 'F-8/1', street: 'Street 12', lat: 33.7005, lng: 73.0553, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 78000000, size: 7,  unit: 'Marla',  bed: 4, bath: 5, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Central heating', 'Lawn'] },
  { owner: 'hamza',  title: '2 Bed Apartment, F-11 Markaz',      city: 'Islamabad',  area: 'F-11',               locality: 'Markaz', buildingName: 'F-11 Heights', apartmentNumber: '4B', floorNumber: 4, totalFloors: 8, lat: 33.6844, lng: 72.9992, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 95000,    size: 1200, unit: 'Sq Ft', bed: 2, bath: 2, status: 'active',  condition: 'like-new', amenities: ['Elevator', 'Security', 'Parking', 'Balcony'], deposit: 190000, advanceRent: 95000, furnished: 'furnished' },
  { owner: 'zara',   title: '1 Kanal Corner House, DHA Phase 5', city: 'Lahore',     area: 'DHA',                locality: 'Phase 5', block: 'XX', street: 'Khhyaban-e-Iqbal', lat: 31.4697, lng: 74.4131, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 92000000, size: 1,  unit: 'Kanal',  bed: 6, bath: 6, status: 'featured', condition: 'brand-new', servantQuarters: 1, amenities: ['Parking', 'Security', 'Swimming pool', 'Servant quarter', 'Lawn', 'Generator'] },
  { owner: 'zara',   title: 'Office Floor on Main Boulevard',    city: 'Lahore',     area: 'Gulberg',            locality: 'MM Alam Road', buildingName: 'Alliance Tower', floorNumber: 3, totalFloors: 12, lat: 31.5150, lng: 74.3450, purpose: 'rent', category: 'commercial', propertyType: 'office',              price: 350000,   size: 2000, unit: 'Sq Ft', bed: 0, bath: 4, status: 'active',  condition: 'good', amenities: ['Elevator', 'Security', 'Parking', 'Generator', 'Reception'], deposit: 1050000, advanceRent: 350000 },
  { owner: 'maria',  title: '10 Marla House in Bahria Town',     city: 'Rawalpindi', area: 'Bahria Town',        locality: 'Phase 7', block: 'Block E', lat: 33.5651, lng: 73.0169, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 42000000, size: 10, unit: 'Marla',  bed: 5, bath: 5, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Lawn', 'Gated community'] },
  { owner: 'maria',  title: '3 Bed Flat in Askari 14',           city: 'Rawalpindi', area: 'Askari',             locality: 'Askari 14', buildingName: 'Askari Towers', floorNumber: 2, totalFloors: 6, lat: 33.5900, lng: 73.0700, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 72000,    size: 1400, unit: 'Sq Ft', bed: 3, bath: 2, status: 'active',  condition: 'good', amenities: ['Security', 'Parking', 'Elevator'], deposit: 144000, advanceRent: 72000, furnished: 'semi-furnished' },
  { owner: 'shahid', title: '5 Marla House in Gulgasht',         city: 'Multan',     area: 'Gulgasht',           locality: 'Block C', street: 'Street 4', lat: 30.1984, lng: 71.4687, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 15000000, size: 5,  unit: 'Marla',  bed: 3, bath: 3, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'shahid', title: '4 Marla Shop on Abdali Road',       city: 'Multan',     area: 'Abdali Road',        locality: 'Abdali Road', street: 'Main Road', lat: 30.1961, lng: 71.4754, purpose: 'sale', category: 'commercial', propertyType: 'shop',               price: 18000000, size: 4,  unit: 'Marla',  bed: 0, bath: 1, status: 'active',   condition: 'good', amenities: ['Security', 'Parking'], corner: true },
  { owner: 'imran',  title: '8 Marla House in University Town',  city: 'Peshawar',   area: 'University Town',    locality: 'Board Bazaar side', lat: 34.0151, lng: 71.5249, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 25000000, size: 8,  unit: 'Marla',  bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Lawn'] },
  { owner: 'imran',  title: '2 Bed Flat in Hyatabad',            city: 'Peshawar',   area: 'Hyatabad',           locality: 'Phase 3', buildingName: 'Hyatabad Apartments', floorNumber: 3, totalFloors: 5, lat: 34.0180, lng: 71.5370, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 45000,    size: 1000, unit: 'Sq Ft', bed: 2, bath: 2, status: 'active',  condition: 'good', amenities: ['Security', 'Parking'], deposit: 90000, advanceRent: 45000 },
  { owner: 'nimra',  title: '5 Marla Plot in F-11',              city: 'Islamabad',  area: 'F-11',               locality: 'F-11/2', plotNumber: '245', corner: true, parkFacing: true, lat: 33.6844, lng: 72.9992, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot',   price: 28000000, size: 5,  unit: 'Marla',  bed: 0, bath: 0, status: 'active',   amenities: ['Boundary wall', 'Electricity', 'Gas', 'Water', 'Sewerage'] },
  { owner: 'nimra',  title: 'Residential Plot in F-14 Sector',   city: 'Islamabad',  area: 'F-14',               locality: 'F-14/1', plotNumber: '88', possession: 'ready', developmentStatus: 'under-development', lat: 33.6870, lng: 72.9720, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot',   price: 22000000, size: 5,  unit: 'Marla',  bed: 0, bath: 0, status: 'pending',  amenities: ['Electricity', 'Water'] },
  { owner: 'raheel', title: '5 Marla Brand New House, Bahria Orchard', city: 'Lahore',  area: 'Bahria Orchard',  locality: 'Sector C', block: 'Block 2', lat: 31.4430, lng: 74.2030, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 32000000, size: 5,  unit: 'Marla', bed: 4, bath: 3, status: 'active',   condition: 'brand-new', amenities: ['Parking', 'Security', 'Lawn', 'Gated community'] },
  { owner: 'raheel', title: '3 Bed Flat in Cavalry Ground',         city: 'Lahore',     area: 'Cavalry Ground', locality: 'Cavalry Ground', buildingName: 'CG Residencia', floorNumber: 5, totalFloors: 10, lat: 31.4820, lng: 74.3410, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 70000,    size: 1200, unit: 'Sq Ft', bed: 3, bath: 2, status: 'active', condition: 'like-new', amenities: ['Elevator', 'Security', 'Parking'], deposit: 140000, advanceRent: 70000, furnished: 'semi-furnished' },
  { owner: 'asma',  title: '5 Marla House in G-11',                city: 'Islamabad',  area: 'G-11',           locality: 'G-11/3', street: 'Street 8', lat: 33.6683, lng: 72.9903, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 65000000, size: 5,  unit: 'Marla',  bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'asma',  title: '2 Bed Apartment in G-10 Markaz',       city: 'Islamabad',  area: 'G-10',           locality: 'Markaz', buildingName: 'G-10 Arcade', floorNumber: 6, totalFloors: 9, lat: 33.6580, lng: 72.9950, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 60000,    size: 1000, unit: 'Sq Ft', bed: 2, bath: 2, status: 'active', condition: 'good', amenities: ['Elevator', 'Security', 'Parking'], deposit: 120000, advanceRent: 60000, furnished: 'furnished' },
  { owner: 'danish', title: '120 Sq Yd House in Gulshan-e-Iqbal',  city: 'Karachi',    area: 'Gulshan',        locality: 'Block 13-D', street: 'University Road', lat: 24.9100, lng: 67.1000, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 75000000, size: 120, unit: 'Sq Yd',  bed: 5, bath: 5, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Lawn'] },
  { owner: 'danish', title: '2 Bed Flat in North Nazimabad',       city: 'Karachi',    area: 'North Nazimabad', locality: 'Block H', buildingName: 'Nazimabad Heights', floorNumber: 3, totalFloors: 7, lat: 24.9500, lng: 67.0500, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 55000,    size: 950,  unit: 'Sq Ft', bed: 2, bath: 2, status: 'active', condition: 'good', amenities: ['Elevator', 'Security'], deposit: 110000, advanceRent: 55000, furnished: 'semi-furnished' },
  { owner: 'saima', title: '10 Marla House in Peoples Colony',     city: 'Faisalabad', area: 'Peoples Colony', locality: 'No. 1', block: 'Block B', lat: 31.4380, lng: 73.0900, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 26000000, size: 10, unit: 'Marla', bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'saima', title: '3 Bed Flat in D-Ground',               city: 'Faisalabad', area: 'D-Ground',       locality: 'D-Ground', buildingName: 'D-Ground Flats', floorNumber: 2, totalFloors: 4, lat: 31.4400, lng: 73.0980, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 45000,    size: 1300, unit: 'Sq Ft', bed: 3, bath: 2, status: 'active', condition: 'good', amenities: ['Security', 'Parking'], deposit: 90000, advanceRent: 45000 },
  { owner: 'noman', title: '7 Marla House in Satellite Town',      city: 'Rawalpindi', area: 'Satellite Town', locality: 'Block A', street: '6th Road', lat: 33.5973, lng: 73.0433, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 50000000, size: 7,  unit: 'Marla', bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'noman', title: '1 Kanal Plot in GHA-1 Rawalpindi',     city: 'Rawalpindi', area: 'Gulraiz Housing Authority', locality: 'GHA-1', plotNumber: '112', mainBoulevard: true, lat: 33.5600, lng: 73.1300, purpose: 'sale', category: 'plot', propertyType: 'residential-plot', price: 28000000, size: 1, unit: 'Kanal', bed: 0, bath: 0, status: 'active', amenities: ['Boundary wall', 'Electricity', 'Gas', 'Water', 'Sewerage'] },
  { owner: 'saad',  title: '1 Kanal House in Gujranwala Cantt',    city: 'Gujranwala', area: 'Cantt',          locality: 'Cantt', street: 'GT Road side', lat: 32.1551, lng: 74.1857, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 35000000, size: 1,  unit: 'Kanal', bed: 5, bath: 5, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Lawn'] },
  { owner: 'saad',  title: '4 Marla House in Gulshan Colony',      city: 'Gujranwala', area: 'Gulshan Colony', locality: 'Gulshan Colony', lat: 32.2000, lng: 74.2000, purpose: 'rent', category: 'home',       propertyType: 'house',              price: 35000,    size: 4,  unit: 'Marla', bed: 3, bath: 2, status: 'active', condition: 'good', amenities: ['Parking'], deposit: 70000, advanceRent: 35000 },
  { owner: 'nadia', title: '8 Marla House in Sialkot Cantt',       city: 'Sialkot',    area: 'Cantt',          locality: 'Cantt', lat: 32.4945, lng: 74.5229, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 38000000, size: 8,  unit: 'Marla', bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'nadia', title: '2 Bed Flat on Defence Road Sialkot',   city: 'Sialkot',    area: 'Defence Road',   locality: 'Defence Road', buildingName: 'Defence Heights', floorNumber: 4, totalFloors: 6, lat: 32.5010, lng: 74.5340, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 40000,    size: 1000, unit: 'Sq Ft', bed: 2, bath: 2, status: 'active', condition: 'good', amenities: ['Elevator', 'Security'], deposit: 80000, advanceRent: 40000, furnished: 'semi-furnished' },
  { owner: 'tariq', title: '5 Marla House in Latifabad',           city: 'Hyderabad',  area: 'Latifabad',      locality: 'Unit 7', lat: 25.3960, lng: 68.3570, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 9500000,  size: 5,  unit: 'Marla', bed: 3, bath: 3, status: 'active',   condition: 'needs-renovation', amenities: ['Parking', 'Security'] },
  { owner: 'tariq', title: '2 Bed Flat in Qasimabad',              city: 'Hyderabad',  area: 'Qasimabad',      locality: 'Qasimabad', buildingName: 'Qasimabad Flats', floorNumber: 1, totalFloors: 4, lat: 25.3860, lng: 68.3560, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 30000,    size: 900,  unit: 'Sq Ft', bed: 2, bath: 2, status: 'active', condition: 'good', amenities: ['Security'], deposit: 60000, advanceRent: 30000 },
  { owner: 'amna',  title: '5 Marla House in Sahiwal',             city: 'Sahiwal',    area: 'Walton Road',    locality: 'Walton Road', lat: 30.6650, lng: 73.1010, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 11000000, size: 5,  unit: 'Marla', bed: 3, bath: 3, status: 'active',   condition: 'good', amenities: ['Parking'] },
  { owner: 'amna',  title: '10 Marla Plot in Sahiwal Scheme',      city: 'Sahiwal',    area: 'Scheme 4',       locality: 'Scheme 4', plotNumber: '56', possession: 'ready', lat: 30.6750, lng: 73.1110, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot',   price: 13000000, size: 10, unit: 'Marla', bed: 0, bath: 0, status: 'active', amenities: ['Boundary wall', 'Electricity', 'Water'] },
  { owner: 'faisal', title: '6 Marla House in Satellite Town Quetta', city: 'Quetta',  area: 'Satellite Town', locality: 'Satellite Town', lat: 30.1880, lng: 67.0130, purpose: 'sale', category: 'home',     propertyType: 'house',              price: 18000000, size: 6,  unit: 'Marla', bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'faisal', title: '1 Kanal Plot on Zarghoon Road',       city: 'Quetta',     area: 'Zarghoon Road',  locality: 'Zarghoon Road', plotNumber: '19', mainBoulevard: true, lat: 30.1798, lng: 66.9750, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot',   price: 9500000,  size: 1,  unit: 'Kanal', bed: 0, bath: 0, status: 'active', amenities: ['Electricity', 'Water'] },
  { owner: 'tooba', title: '5 Marla House in E-11',                city: 'Islamabad',  area: 'E-11',           locality: 'E-11/4', street: 'Street 5', lat: 33.6560, lng: 72.9440, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 62000000, size: 5,  unit: 'Marla', bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Lawn'] },
  { owner: 'tooba', title: '2 Bed Flat in I-8 Markaz',             city: 'Islamabad',  area: 'I-8',            locality: 'Markaz', buildingName: 'I-8 Residences', floorNumber: 5, totalFloors: 8, lat: 33.6695, lng: 73.0330, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 55000,    size: 1000, unit: 'Sq Ft', bed: 2, bath: 2, status: 'active', condition: 'like-new', amenities: ['Elevator', 'Security', 'Parking'], deposit: 110000, advanceRent: 55000, furnished: 'furnished' },
  { owner: 'kamran', title: '7 Marla House in Model Town',         city: 'Lahore',     area: 'Model Town',     locality: 'Block L', street: 'Link Road', lat: 31.4805, lng: 74.3239, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 68000000, size: 7,  unit: 'Marla', bed: 4, bath: 4, status: 'active',   condition: 'good', amenities: ['Parking', 'Security', 'Generator'] },
  { owner: 'kamran', title: '5 Marla Plot in DHA Phase 8',         city: 'Lahore',     area: 'DHA',            locality: 'Phase 8', plotNumber: '401', parkFacing: true, lat: 31.4900, lng: 74.3500, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot',   price: 15000000, size: 5,  unit: 'Marla', bed: 0, bath: 0, status: 'pending',  amenities: ['Boundary wall', 'Electricity', 'Gas', 'Water', 'Sewerage'] },
  { owner: 'azhar', title: '2 Kanal Farmhouse in Okara',           city: 'Okara',      area: 'Depalpur Road',  locality: 'Depalpur Road', lat: 30.8090, lng: 73.4470, purpose: 'sale', category: 'home',       propertyType: 'farm-house',         price: 14000000, size: 2,  unit: 'Kanal', bed: 4, bath: 3, status: 'active',   condition: 'good', amenities: ['Lawn', 'Parking', 'Security', 'Garden'] },
  { owner: 'azhar', title: '5 Marla House in Okara Cantt',         city: 'Okara',      area: 'Cantt',          locality: 'Cantt', lat: 30.7560, lng: 73.3760, purpose: 'rent', category: 'home',       propertyType: 'house',              price: 28000,    size: 5,  unit: 'Marla', bed: 3, bath: 2, status: 'active', condition: 'good', amenities: ['Parking'], deposit: 56000, advanceRent: 28000 },
  { owner: 'saman', title: '5 Marla House in Gulgasht Block C',    city: 'Multan',     area: 'Gulgasht',       locality: 'Block C', street: 'Street 9', lat: 30.1984, lng: 71.4687, purpose: 'sale', category: 'home',       propertyType: 'house',              price: 14000000, size: 5,  unit: 'Marla', bed: 3, bath: 3, status: 'active',   condition: 'good', amenities: ['Parking', 'Security'] },
  { owner: 'saman', title: '3 Bed Flat in Gulgasht',               city: 'Multan',     area: 'Gulgasht',       locality: 'Gulgasht', buildingName: 'Gulgasht Heights', floorNumber: 2, totalFloors: 5, lat: 30.1920, lng: 71.4730, purpose: 'rent', category: 'home',       propertyType: 'flat',               price: 35000,    size: 1100, unit: 'Sq Ft', bed: 3, bath: 2, status: 'active', condition: 'good', amenities: ['Security', 'Parking'], deposit: 70000, advanceRent: 35000, furnished: 'semi-furnished' },
];

/* Buyer requirements — tuned so the overlap matcher below pairs several. */
const REQUIREMENTS = [
  { owner: 'owais', title: '5 Marla house in Gulgasht Multan',   city: 'Multan',     area: 'Gulgasht',           purpose: 'sale', category: 'home', propertyType: 'house', min: 12000000, max: 18000000, bed: 3 },
  { owner: 'hira',  title: '3 bed furnished flat in DHA Karachi', city: 'Karachi',    area: 'DHA',                purpose: 'rent', category: 'home', propertyType: 'flat',  min: 130000,   max: 170000,   bed: 3 },
  { owner: 'ayesha', title: 'House in Bahria Town Rawalpindi',   city: 'Rawalpindi', area: 'Bahria Town',        purpose: 'sale', category: 'home', propertyType: 'house', min: 36000000, max: 46000000, bed: 4 },
  { owner: 'ayesha', title: '2 bed apartment in Islamabad F-11', city: 'Islamabad',  area: 'F-11',               purpose: 'rent', category: 'home', propertyType: 'flat',  min: 80000,    max: 110000,   bed: 2 },
  { owner: 'erum',   title: '2 bed flat in Gulshan-e-Iqbal Karachi', city: 'Karachi', area: 'Gulshan',          purpose: 'rent', category: 'home', propertyType: 'flat',  min: 45000,    max: 60000,    bed: 2 },
  { owner: 'erum',   title: 'House in Gulshan-e-Iqbal Karachi',      city: 'Karachi', area: 'Gulshan',          purpose: 'sale', category: 'home', propertyType: 'house', min: 65000000, max: 82000000, bed: 5 },
  { owner: 'rubab',  title: '2 bed flat in I-8 Islamabad',           city: 'Islamabad', area: 'I-8',            purpose: 'rent', category: 'home', propertyType: 'flat',  min: 48000,    max: 62000,    bed: 2 },
  { owner: 'bilawal', title: '3 bed flat in Cavalry Ground Lahore',  city: 'Lahore',  area: 'Cavalry Ground',   purpose: 'rent', category: 'home', propertyType: 'flat',  min: 60000,    max: 80000,    bed: 3 },
  { owner: 'bilawal', title: '5 Marla house in Bahria Orchard',      city: 'Lahore',  area: 'Bahria Orchard',   purpose: 'sale', category: 'home', propertyType: 'house', min: 28000000, max: 36000000, bed: 4 },
  { owner: 'mahnoor', title: '7 Marla house in Satellite Town',      city: 'Rawalpindi', area: 'Satellite Town', purpose: 'sale', category: 'home', propertyType: 'house', min: 44000000, max: 55000000, bed: 4 },
  { owner: 'farhan', title: '10 Marla house in Peoples Colony',      city: 'Faisalabad', area: 'Peoples Colony', purpose: 'sale', category: 'home', propertyType: 'house', min: 22000000, max: 30000000, bed: 4 },
  { owner: 'zehra', title: '5 Marla house in Latifabad',             city: 'Hyderabad', area: 'Latifabad',      purpose: 'sale', category: 'home', propertyType: 'house', min: 8000000,  max: 11000000, bed: 3 },
];

const DAY = 24 * 3600e3;
const ago = (ms) => new Date(Date.now() - ms);

let _s = 42;
const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing from .env — bailing.');
    process.exit(1);
  }

  const emails = PEOPLE.map((p) => `${p.key}${DOMAIN}`);

  /* Guard: each property must have a globally unique photo set. */
  const allIds = PHOTO_SETS.flat();
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  if (dupes.length) {
    console.error('Duplicate photo ids in PHOTO_SETS:', [...new Set(dupes)]);
    process.exit(1);
  }
  if (PHOTO_SETS.length < PROPERTIES.length) {
    console.error(`Need ${PROPERTIES.length} photo sets, have ${PHOTO_SETS.length}.`);
    process.exit(1);
  }

  /* ── 1. Clean up any prior runs — deleting the users cascades their
     properties / listings / requirements / matches. ── */
  const cleared = await prisma.user.deleteMany({ where: { email: { in: emails } } });
  if (cleared.count) console.log(`Cleared ${cleared.count} previous mock user(s) + their data.`);

  /* ── 2. Users (password Test@123 for all) ── */
  const hash = await bcrypt.hash(PASS, 10);
  const U = {};
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i];
    U[p.key] = await prisma.user.create({
      data: {
        name: p.name,
        email: emails[i],
        password: hash,
        role: p.role,
        verified: true,
        suspended: false,
        avatar: '',
        phone: p.phone,
        location: p.location,
        emergencyContact: '',
        latitude: p.latitude,
        longitude: p.longitude,
        createdAt: ago(int(20, 120) * DAY),
      },
    });
  }
  console.log(`Users:          ${Object.keys(U).length}`);

  /* ── 3. Properties — one unique photo set each ── */
  const props = [];
  for (let i = 0; i < PROPERTIES.length; i++) {
    const d = PROPERTIES[i];
    const owner = U[d.owner];
    const created = ago(int(2, 60) * DAY);
    const prop = await prisma.property.create({
      data: toPropertyCreateData(d, {
        owner,
        photos: PHOTO_SETS[i].map(img),
        createdAt: created,
        actingRole: owner.role,
        index: i,
      }),
    });
    await prisma.listing.create({
      data: {
        propertyId: prop.id,
        ownerId: owner.id,
        views: int(12, 480),
        inquiries: int(0, 25),
        status: d.status === 'featured' ? 'featured' : d.status === 'pending' ? 'pending' : 'active',
        createdAt: created,
      },
    });
    props.push({ prop, d, owner });
  }
  console.log(`Properties:     ${props.length} (distinct photos)`);
  console.log(`Listings:       ${props.length}`);

  /* ── 4. Requirements (buyers) ── */
  const reqs = [];
  for (const r of REQUIREMENTS) {
    const owner = U[r.owner];
    const req = await prisma.requirement.create({
      data: {
        requiredById: owner.id,
        title: r.title,
        location: { city: r.city, area: r.area },
        budget: { min: r.min, max: r.max },
        purpose: r.purpose,
        propertyType: r.propertyType,
        size: '',
        bedrooms: r.bed,
        bathrooms: null,
        notes: `Looking for a ${r.propertyType.replace(/-/g, ' ')} in ${r.area}, ${r.city}. Budget PKR ${r.min.toLocaleString()} - ${r.max.toLocaleString()}.`,
        urgency: pick(['30 days', '60 days', 'flexible']),
        status: 'active',
        actingRole: owner.role,
        createdAt: ago(int(1, 40) * DAY),
      },
    });
    reqs.push({ req, r, owner });
  }
  console.log(`Requirements:   ${reqs.length}`);

  /* ── 5. Matches — pair requirements with genuinely compatible properties ── */
  const overlaps = (p, r) =>
    p.d.city === r.r.city &&
    p.d.purpose === r.r.purpose &&
    p.d.category === r.r.category &&
    p.d.price >= r.r.min * 0.9 &&
    p.d.price <= r.r.max * 1.1 &&
    p.owner.id !== r.owner.id;

  const matchRows = [];
  for (const r of reqs) {
    for (const p of props.filter((x) => overlaps(x, r))) {
      const typeMap = { seller: 'seller-buyer', dealer: 'dealer-buyer' };
      matchRows.push({
        propertyId: p.prop.id,
        requirementId: r.req.id,
        initiatorId: p.owner.id,
        score: int(68, 97),
        type: typeMap[p.owner.role] || 'seller-buyer',
        status: 'pending',
        notes: `Auto-matched on ${p.d.city} · ${p.d.category} · budget fit.`,
        aiScore: int(60, 95) / 10,
        aiStatus: 'scored',
        aiReason: 'Location, budget and property type all align with the stated requirement.',
        createdAt: ago(int(1, 20) * DAY),
      });
    }
  }
  if (matchRows.length) await prisma.match.createMany({ data: matchRows });
  console.log(`Matches:        ${matchRows.length}`);

  /* ── Summary ── */
  console.log('\n────────────────────────────────────────────');
  console.log('  MOCK DATA SEEDED');
  console.log('────────────────────────────────────────────');
  console.log(`  Password for all:  ${PASS}`);
  PEOPLE.forEach((p) => console.log(`    ${p.role.toUpperCase().padEnd(6)}  ${p.key}${DOMAIN}`));
  console.log('────────────────────────────────────────────\n');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await prisma.$disconnect(); } catch (_) {}
  process.exit(1);
});