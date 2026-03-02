
// // utils/constants.js
// utils/constants.js
const LANGUAGES = [
  { id: 1, name: 'English' },
  { id: 2, name: 'French' },
  { id: 3, name: 'Spanish' },
  { id: 4, name: 'Hindi' },
  { id: 5, name: 'Urdu' },
  // { id: 6, name: 'Japanese' },
  // { id: 7, name: 'Hindi' },
  // { id: 8, name: 'Arabic' },
  // { id: 9, name: 'Portuguese' },
  // { id: 10, name: 'Russian' },
  // { id: 11, name: 'Korean' },
  // { id: 12, name: 'Italian' },
  // { id: 13, name: 'Dutch' },
  // { id: 14, name: 'Turkish' },
  // { id: 15, name: 'Polish' },
  // { id: 16, name: 'Swedish' },
];
const Categories = [
  { id: 1, name: 'Musician' },
  { id: 2, name: 'Singer' }
];
const GENRES = [
  { id: 1, name: 'Jazz' },
  { id: 2, name: 'Country' },
  { id: 3, name: 'Gospel' },
  { id: 4, name: 'Christian' },
  { id: 5, name: 'RnB' },
  { id: 6, name: 'Pop' },
  { id: 7, name: 'Blues' },
  { id: 8, name: 'Funk' },

];

const GENDERS = [
  { id: 1, name: 'Male' },
  { id: 2, name: 'Female' },
  { id: 3, name: 'Other' },
];

const BADGES = [
  { id: 1, label: 'New', color: 'bg-gray-500' },
  { id: 2, label: 'Rising Talent', color: 'bg-blue-500' },
  { id: 3, label: 'Top Rated', color: 'bg-green-500' },
  { id: 4, label: 'Top Rated Plus', color: 'bg-purple-500' },
  { id: 5, label: 'Deans List Endorsed', color:'bg-yellow-500'},
];

const STATES = [
  { id: 1, name: 'Alabama' },
  { id: 2, name: 'Alaska' },
  { id: 3, name: 'Arizona' },
  { id: 4, name: 'Arkansas' },
  { id: 5, name: 'California' },
  { id: 6, name: 'Colorado' },
  { id: 7, name: 'Connecticut' },
  { id: 8, name: 'Delaware' },
  { id: 9, name: 'Florida' },
  { id: 10, name: 'Georgia' },
  { id: 11, name: 'Hawaii' },
  { id: 12, name: 'Idaho' },
  { id: 13, name: 'Illinois' },
  { id: 14, name: 'Indiana' },
  { id: 15, name: 'Iowa' },
  { id: 16, name: 'Kansas' },
  { id: 17, name: 'Kentucky' },
  { id: 18, name: 'Louisiana' },
  { id: 19, name: 'Maine' },
  { id: 20, name: 'Maryland' },
  { id: 21, name: 'Massachusetts' },
  { id: 22, name: 'Michigan' },
  { id: 23, name: 'Minnesota' },
  { id: 24, name: 'Mississippi' },
  { id: 25, name: 'Missouri' },
  { id: 26, name: 'Montana' },
  { id: 27, name: 'Nebraska' },
  { id: 28, name: 'Nevada' },
  { id: 29, name: 'New Hampshire' },
  { id: 30, name: 'New Jersey' },
  { id: 31, name: 'New Mexico' },
  { id: 32, name: 'New York' },
  { id: 33, name: 'North Carolina' },
  { id: 34, name: 'North Dakota' },
  { id: 35, name: 'Ohio' },
  { id: 36, name: 'Oklahoma' },
  { id: 37, name: 'Oregon' },
  { id: 38, name: 'Pennsylvania' },
  { id: 39, name: 'Rhode Island' },
  { id: 40, name: 'South Carolina' },
  { id: 41, name: 'South Dakota' },
  { id: 42, name: 'Tennessee' },
  { id: 43, name: 'Texas' },
  { id: 44, name: 'Utah' },
  { id: 45, name: 'Vermont' },
  { id: 46, name: 'Virginia' },
  { id: 47, name: 'Washington' },
  { id: 48, name: 'West Virginia' },
  { id: 49, name: 'Wisconsin' },
  { id: 50, name: 'Wyoming' },
];


// Derived constant maps
const BADGE_LABELS = BADGES.reduce((acc, badge) => ({ ...acc, [badge.id]: badge.label }), {});
const BADGE_COLORS = BADGES.reduce((acc, badge) => ({ ...acc, [badge.id]: badge.color }), {});

// Mapping functions
const getLanguageNameById = id => LANGUAGES.find(lang => lang.id === id)?.name;
const getLanguageIdByName = name => LANGUAGES.find(lang => lang.name === name)?.id;
const getGenreNameById = id => GENRES.find(genre => genre.id === id)?.name;
const getCategoryNameById = id => Categories.find(cat => cat.id === id)?.name;
const getGenreIdByName = name => GENRES.find(genre => genre.name === name)?.id;
const getGenderNameById = id => GENDERS.find(gender => gender.id === id)?.name;
const getGenderIdByName = name => GENDERS.find(gender => gender.name === name)?.id;
const getBadgeLabelById = id => BADGES.find(badge => badge.id === id)?.label;
const getBadgeColorById = id => BADGES.find(badge => badge.id === id)?.color;
// --- State Helpers ---
const getStateNameById = id => STATES.find(state => state.id === id)?.name;
const getStateIdByName = name => STATES.find(state => state.name === name)?.id;

module.exports = {
  LANGUAGES,
  GENRES,
  GENDERS,
  BADGES,
  BADGE_LABELS,
  BADGE_COLORS,
  STATES,
  getLanguageNameById,
  getLanguageIdByName,
  getGenreNameById,
  getGenreIdByName,
  getGenderNameById,
  getGenderIdByName,
  getBadgeLabelById,
  getBadgeColorById,
  getStateNameById,   
  getStateIdByName,
  getCategoryNameById,
  Categories,
};