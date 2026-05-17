// 3-letter FIFA codes for each country, indexed by countryId (0..210).
// Derived from countries.json. Where a country doesn't have a well-known FIFA
// code, we derive a 3-letter abbreviation from the country name.

const COUNTRIES = require('./countries.json');

// Authoritative overrides — these are the official FIFA 3-letter codes
// where they differ from a naive 3-letter abbreviation.
const OVERRIDES = {
  'France': 'FRA', 'Spain': 'ESP', 'Argentina': 'ARG', 'England': 'ENG', 'Portugal': 'POR',
  'Brazil': 'BRA', 'Netherlands': 'NED', 'Morocco': 'MAR', 'Belgium': 'BEL', 'Germany': 'GER',
  'Croatia': 'CRO', 'Italy': 'ITA', 'Colombia': 'COL', 'Senegal': 'SEN', 'Mexico': 'MEX',
  'USA': 'USA', 'Uruguay': 'URU', 'Japan': 'JPN', 'Switzerland': 'SUI', 'Denmark': 'DEN',
  'Iran': 'IRN', 'Türkiye': 'TUR', 'Ecuador': 'ECU', 'Austria': 'AUT', 'South Korea': 'KOR',
  'Nigeria': 'NGA', 'Australia': 'AUS', 'Algeria': 'ALG', 'Egypt': 'EGY', 'Canada': 'CAN',
  'Norway': 'NOR', 'Ukraine': 'UKR', 'Sweden': 'SWE', 'Wales': 'WAL', 'Czechia': 'CZE',
  'Tunisia': 'TUN', 'Serbia': 'SRB', 'Russia': 'RUS', 'Poland': 'POL', 'Romania': 'ROU',
  'Chile': 'CHI', 'Hungary': 'HUN', 'Scotland': 'SCO', 'Slovakia': 'SVK', 'Greece': 'GRE',
  'Mali': 'MLI', 'Paraguay': 'PAR', 'Cameroon': 'CMR', "Côte d'Ivoire": 'CIV', 'Slovenia': 'SVN',
  'Costa Rica': 'CRC', 'Peru': 'PER', 'Qatar': 'QAT', 'Saudi Arabia': 'KSA', 'Republic of Ireland': 'IRL',
  'Iraq': 'IRQ', 'Northern Ireland': 'NIR', 'Iceland': 'ISL', 'Burkina Faso': 'BFA', 'Finland': 'FIN',
  'Bosnia and Herzegovina': 'BIH', 'DR Congo': 'COD', 'Ghana': 'GHA', 'Jamaica': 'JAM', 'South Africa': 'RSA',
  'Albania': 'ALB', 'North Macedonia': 'MKD', 'Cabo Verde': 'CPV', 'Oman': 'OMA', 'Uzbekistan': 'UZB',
  'Bulgaria': 'BUL', 'Honduras': 'HON', 'Panama': 'PAN', 'UAE': 'UAE', 'Bolivia': 'BOL',
  'Venezuela': 'VEN', 'Guinea': 'GUI', 'Israel': 'ISR', 'Jordan': 'JOR', 'Montenegro': 'MNE',
  'Georgia': 'GEO', 'Bahrain': 'BHR', 'China PR': 'CHN', 'Zambia': 'ZAM', 'Gabon': 'GAB',
  'Luxembourg': 'LUX', 'Curaçao': 'CUW', 'Belarus': 'BLR', 'Haiti': 'HAI', 'Syria': 'SYR',
  'Mauritania': 'MTN', 'Vietnam': 'VIE', 'Kosovo': 'KVX', 'Benin': 'BEN', 'Uganda': 'UGA',
  'Kyrgyzstan': 'KGZ', 'El Salvador': 'SLV', 'Equatorial Guinea': 'EQG', 'Madagascar': 'MAD', 'Mozambique': 'MOZ',
  'Trinidad and Tobago': 'TRI', 'Kenya': 'KEN', 'Tajikistan': 'TJK', 'Thailand': 'THA', 'Armenia': 'ARM',
  'Estonia': 'EST', 'India': 'IND', 'Sierra Leone': 'SLE', 'Lithuania': 'LTU', 'Cyprus': 'CYP',
  'Latvia': 'LVA', 'Libya': 'LBY', 'Togo': 'TOG', 'Niger': 'NIG', 'Comoros': 'COM',
  'Angola': 'ANG', 'Lebanon': 'LBN', 'Faroe Islands': 'FRO', 'Palestine': 'PLE', 'Zimbabwe': 'ZIM',
  'Antigua and Barbuda': 'ATG', 'Sudan': 'SDN', 'Malawi': 'MWI', 'Azerbaijan': 'AZE', 'Kazakhstan': 'KAZ',
  'Guinea-Bissau': 'GNB', 'Botswana': 'BOT', 'Namibia': 'NAM', 'Suriname': 'SUR', 'Tanzania': 'TAN',
  'Ethiopia': 'ETH', 'Burundi': 'BDI', 'Liberia': 'LBR', 'Solomon Islands': 'SOL', 'Yemen': 'YEM',
  'Rwanda': 'RWA', 'New Zealand': 'NZL', 'Indonesia': 'IDN', 'Hong Kong': 'HKG', 'Andorra': 'AND',
  'Eswatini': 'SWZ', 'Lesotho': 'LES', 'Republic of Congo': 'CGO', 'Saint Kitts and Nevis': 'SKN', 'Malaysia': 'MAS',
  'Central African Republic': 'CTA', 'Saint Lucia': 'LCA', 'Philippines': 'PHI', 'Moldova': 'MDA', 'Vanuatu': 'VAN',
  'Afghanistan': 'AFG', 'Maldives': 'MDV', 'Bermuda': 'BER', 'Tahiti': 'TAH', 'Singapore': 'SGP',
  'Papua New Guinea': 'PNG', 'Turkmenistan': 'TKM', 'Nicaragua': 'NCA', 'Dominican Republic': 'DOM', 'Saint Vincent and Grenadines': 'VIN',
  'Fiji': 'FIJ', 'Myanmar': 'MYA', 'Liechtenstein': 'LIE', 'Guyana': 'GUY', 'Puerto Rico': 'PUR',
  'Cuba': 'CUB', 'Barbados': 'BRB', 'Belize': 'BLZ', 'Grenada': 'GRN', 'Chinese Taipei': 'TPE',
  'Gambia': 'GAM', 'Dominica': 'DMA', 'Montserrat': 'MSR', 'Mauritius': 'MRI', 'New Caledonia': 'NCL',
  'Bahamas': 'BAH', 'Cambodia': 'CAM', 'Bangladesh': 'BAN', 'São Tomé and Príncipe': 'STP', 'Cook Islands': 'COK',
  'Samoa': 'SAM', 'Nepal': 'NEP', 'Brunei': 'BRU', 'Macau': 'MAC', 'Mongolia': 'MNG',
  'Bhutan': 'BHU', 'Pakistan': 'PAK', 'Cayman Islands': 'CAY', 'Laos': 'LAO', 'Djibouti': 'DJI',
  'Sri Lanka': 'SRI', 'Aruba': 'ARU', 'Timor-Leste': 'TLS', 'Eritrea': 'ERI', 'Seychelles': 'SEY',
  'Somalia': 'SOM', 'Chad': 'CHA', 'Tonga': 'TGA', 'South Sudan': 'SSD', 'Gibraltar': 'GIB',
  'Bonaire': 'BOE', 'Saint Martin': 'SMN', 'Saint-Barthélemy': 'SBH', 'British Virgin Islands': 'VGB', 'US Virgin Islands': 'VIR',
  'Anguilla': 'AIA', 'Turks and Caicos': 'TCA', 'Guam': 'GUM', 'Northern Mariana Islands': 'NMI', 'San Marino': 'SMR',
  'Tuvalu': 'TUV', 'Kiribati': 'KIR',
};

const ASCII = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');

function codeFor(name) {
  if (OVERRIDES[name]) return OVERRIDES[name];
  const clean = ASCII(name);
  return clean.slice(0, 3).padEnd(3, 'X');
}

const codes = COUNTRIES.map((c) => codeFor(c.name));

module.exports = { codes, codeFor };

if (require.main === module) {
  // Self-check + print summary
  const missing = COUNTRIES.filter((c) => !OVERRIDES[c.name]).map((c) => c.name);
  console.log('Generated', codes.length, 'codes');
  console.log('Without explicit override (derived from name):', missing.length);
  if (missing.length) console.log('  ', missing.join(', '));
}
