const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Fix the import path to match the actual filename case
const Seller = require('../models/Seller');
const Category = require('../models/category');
const upload = require('../middleware/multer');
const {
  LANGUAGES,
  GENRES,
  GENDERS,
  BADGES,
  BADGE_LABELS,
  BADGE_COLORS,
  getLanguageNameById,
  getLanguageIdByName,
  getGenreNameById,
  getGenreIdByName,
  getGenderNameById,
  getGenderIdByName,
  getBadgeLabelById,
  getBadgeColorById,
} = require('../utils/constants');
const sanitizeHtml = require('sanitize-html'); //for joeditor
const path = require("path");




// POST: Seller Signup (User Details Only)
exports.signup = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      username,
      email,
      phone,
      city,
      zip_code,
      password,
      confirmPassword,
      agreed_to_terms,
      google_id,
      rememberMe,
      gender,
    } = req.body;

    // Sanitize inputs
    const sanitized = {
      first_name: validator.trim(first_name || ''),
      last_name: validator.trim(last_name || ''),
      username: validator.trim(username || ''),
      email: validator.trim(email || ''),
      phone: validator.trim(phone || ''),
      city: validator.trim(city || ''),
      zip_code: validator.trim(zip_code || ''),
      password: validator.trim(password || ''),
      confirmPassword: validator.trim(confirmPassword || ''),
      gender: validator.trim(gender || ''),
    };
    for (let key in sanitized) {
      if (key !== 'gender') sanitized[key] = validator.escape(sanitized[key]);
    }
    // Validate required fields
    if (
      !sanitized.first_name ||
      !sanitized.username ||
      !sanitized.city ||
      !sanitized.zip_code ||
      !sanitized.password ||
      !sanitized.confirmPassword ||
      !agreed_to_terms
    ) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // Validate either email or phone is provided
    if (!sanitized.email && !sanitized.phone) {
      return res.status(400).json({ message: 'Either email or phone number is required.' });
    }

    // Validate first_name
    if (sanitized.first_name.length < 2) {
      return res.status(400).json({ message: 'First name must be at least 2 characters.' });
    }

    // Validate username
    if (sanitized.username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(sanitized.username)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores.' });
    }

    // Validate email (if provided)
    if (sanitized.email && !validator.isEmail(sanitized.email)) {
      return res.status(400).json({ message: 'Invalid email.' });
    }

    // Validate phone (if provided)
    if (sanitized.phone && !/^\d{10}$/.test(sanitized.phone)) {
      return res.status(400).json({ message: 'Phone must be a 10-digit number.' });
    }

    // Validate city
    if (sanitized.city.length < 2) {
      return res.status(400).json({ message: 'City must be at least 2 characters.' });
    }

    // Validate zip_code
    if (!/^\d{5,6}$/.test(sanitized.zip_code)) {
      return res.status(400).json({ message: 'Zip code must be 5 or 6 digits.' });
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(sanitized.password)) {
      return res.status(400).json({
        message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character.',
      });
    }

    // Validate confirmPassword
    if (sanitized.password !== sanitized.confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Validate gender (optional)
    let genderId = [];
    if (sanitized.gender) {
      const genderIdValue = getGenderIdByName(sanitized.gender);
      if (!genderIdValue) {
        return res.status(400).json({
          message: 'Invalid gender. Must be one of: ' + GENDERS.map(g => g.name).join(', '),
        });
      }
      genderId = [genderIdValue];
    }

    // Check for existing seller
    const existingQuery = [];
    if (sanitized.username) existingQuery.push({ username: sanitized.username });
    if (sanitized.email) existingQuery.push({ email: sanitized.email });
    if (sanitized.phone) existingQuery.push({ phone: sanitized.phone });
    const existing = await Seller.findOne({ $or: existingQuery });
    if (existing) {
      return res.status(400).json({ message: 'Username, email, or phone already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(sanitized.password, 10);

    // Create seller with user details and gender
    const sellerData = {
      first_name: sanitized.first_name,
      last_name: sanitized.last_name,
      username: sanitized.username,
      email: sanitized.email || null,
      phone: sanitized.phone || null,
      city: sanitized.city,
      zip_code: sanitized.zip_code,
      password: hashedPassword,
      agreed_to_terms,
      gender: genderId,
      badge: 1, // Default badge for new sellers
    };
    // Only include google_id if provided (e.g., from Google OAuth)
    if (google_id) {
      sellerData.google_id = google_id;
    }

    const seller = await Seller.create(sellerData);

    // Generate JWT
    const expiresIn = rememberMe ? '30d' : '1h';
    const token = jwt.sign({ userId: seller._id }, process.env.JWT_SECRET, { expiresIn });

    res.status(201).json({
      success: true,
      message: 'Seller created successfully.',
      token,
      seller: {
        email: seller.email,
        phone: seller.phone,
        username: seller.username,
        gender: getGenderNameById(seller.gender[0]) || '',
      },
    });
  } catch (error) {
    console.error('Seller signup error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.updateSeller = async (req, res) => { 
  try {
    const seller = await Seller.findOne({ email: req.body.email });
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found.' });
    }
    const updatedSeller = await Seller.findByIdAndUpdate(seller._id, req.body, { new: true });
    res.status(200).json({ message: 'Seller updated successfully.', seller: updatedSeller });
  } catch (error) {
    console.error('Error updating seller:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
}


exports.sellerImageUpload = (req, res) => {
  upload.single('image')(req, res, async (err) => {
    try {
      // Multer error handling
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await Seller.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      user.image = `/uploads/${req.file.filename}`;
      const updateUser = await Seller.findByIdAndUpdate(user._id, { image: user.image }, { new: true });
      //await user.save();

      return res.status(200).json({
        message: 'Image uploaded successfully',
        image: updateUser.image,
      });

    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};



// POST: Seller Signin
exports.signin = async (req, res) => {
  try {
    const { email, phone, password, rememberMe } = req.body;

    // Sanitize inputs
    const sanitized = {
      email: validator.trim(email || ''),
      phone: validator.trim(phone || ''),
      password: validator.trim(password || ''),
    };

    // Validate either email or phone is provided
    if (!sanitized.email && !sanitized.phone) {
      return res.status(400).json({ message: 'Either email or phone number is required.' });
    }

    // Validate email (if provided)
    if (sanitized.email && !validator.isEmail(sanitized.email)) {
      return res.status(400).json({ message: 'Invalid email.' });
    }

    // Validate phone (if provided)
    if (sanitized.phone && !/^\d{10}$/.test(sanitized.phone)) {
      return res.status(400).json({ message: 'Phone must be a 10-digit number.' });
    }

    // Validate password
    if (!sanitized.password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    // Find seller by email or phone
    const query = [];
    if (sanitized.email) query.push({ email: sanitized.email });
    if (sanitized.phone) query.push({ phone: sanitized.phone });
    const seller = await Seller.findOne({ $or: query });
    if (!seller) {
      return res.status(401).json({ message: 'Invalid email/phone or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(sanitized.password, seller.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email/phone or password.' });
    }

    // Generate JWT
    const expiresIn = rememberMe ? '30d' : '1h';
    const token = jwt.sign({ userId: seller._id }, process.env.JWT_SECRET, { expiresIn });

    res.status(200).json({
      success: true,
      message: 'Sign in successful.',
      token,
      seller: {
        id: seller._id,
        email: seller.email || null,
        phone: seller.phone || null,
        username: seller.username,
        image: seller.image || 'http://192.168.29.179:5000/stories/profile1.png',
        gender: getGenderNameById(seller.gender[0]) || '',

      },
    });
  } catch (error) {
    console.error('Seller signin error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};



// // GET: Fetch All Sellers
// exports.getSellers = async (req, res) => {
//   try {
//     const sellers = await Seller.find().select('-password');
//     const now = new Date();
//     const sellersWithActiveStories = sellers.map(seller => {
//       const activeStories = seller.stories.filter(story => {
//         const storyDate = new Date(story.created_at);
//         const hoursDiff = (now - storyDate) / (1000 * 60 * 60);
//         return hoursDiff <= 24;
//       });
//       return { ...seller.toObject(), stories: activeStories };
//     });
//     res.status(200).json({ success: true, data: sellersWithActiveStories });
//   } catch (error) {
//     console.error('Get Sellers error:', error);
//     res.status(400).json({ success: false, message: 'Server error.' });
//   }
// };


// // GET: Fetch All Sellers with Pagination
// exports.getSellers = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
    
//     // Get search query if provided
//     const searchQuery = req.query.search || '';
//     const category = req.query.category || '';
    
//     // Build search filter
//     let searchFilter = {};
//     if (searchQuery) {
//       searchFilter = {
//         $or: [
//           { first_name: { $regex: searchQuery, $options: 'i' } },
//           { last_name: { $regex: searchQuery, $options: 'i' } },
//           { description: { $regex: searchQuery, $options: 'i' } },
//           { long_description: { $regex: searchQuery, $options: 'i' } }
//         ]
//       };
//     }
    
//     // Add category filter if provided
//     if (category) {
//       // Map category names to service IDs based on your SERVICE_LABELS
//       const categoryMap = {
//         'Singer': 1,
//         'Guitarist': 2,
//         'Drummer': 3
//       };
      
//       if (categoryMap[category]) {
//         searchFilter.services = { $in: [categoryMap[category]] };
//       }
//     }

//     // Get total count for pagination info
//     const totalSellers = await Seller.countDocuments(searchFilter);
    
//     // Fetch sellers with pagination
//     const sellers = await Seller.find(searchFilter)
//       .select('-password')
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 }); // Sort by newest first
    
//     const now = new Date();
//     const sellersWithActiveStories = sellers.map(seller => {
//       const activeStories = seller.stories.filter(story => {
//         const storyDate = new Date(story.created_at);
//         const hoursDiff = (now - storyDate) / (1000 * 60 * 60);
//         return hoursDiff <= 24;
//       });
//       return { ...seller.toObject(), stories: activeStories };
//     });
    
//     // Calculate pagination info
//     const totalPages = Math.ceil(totalSellers / limit);
//     const hasNextPage = page < totalPages;
//     const hasPrevPage = page > 1;
    
//     res.status(200).json({ 
//       success: true, 
//       data: sellersWithActiveStories,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalItems: totalSellers,
//         itemsPerPage: limit,
//         hasNextPage,
//         hasPrevPage
//       }
//     });
//   } catch (error) {
//     console.error('Get Sellers error:', error);
//     res.status(400).json({ success: false, message: 'Server error.' });
//   }
// };



// GET: Fetch All Sellers with Pagination and Filters
exports.getSellers = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    const category = req.query.category || '';
    const section = req.query.section || '';
    // Filter parameters
    const subcategories = req.query.subcategories ? req.query.subcategories.split(',') : [];
    const priceRange = req.query.price_range ? req.query.price_range.split(',') : [];
    const genres = req.query.genres ? req.query.genres.split(',') : [];
    const languages = req.query.languages ? req.query.languages.split(',') : [];
    const gender = req.query.gender ? req.query.gender.split(',') : [];
    const badge = req.query.badge ? req.query.badge.split(',') : [];
    const availabilityDate = req.query.availability_date || '';
    const zipCode = req.query.zip_code || '';
    const range = parseInt(req.query.range) || 0;
    const buyerId = req.user ? req.user : null; 
    const categories = await Category.find();
    const subcategoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach(sub => {
        acc[sub.subcategory_id] = sub.name;
        acc[sub.name.toLowerCase().trim()] = sub.subcategory_id;
        acc[sub.name.toLowerCase().replace(/\s+/g, '-')] = sub.subcategory_id;
      });
      return acc;
    }, {});

    // console.log('Subcategory map:', subcategoryMap);

    // Fetch buyer's savedTalents once for performance
    const buyer = buyerId ? await buyer.findById(buyerId).select('savedTalents') : null;
    const savedTalents = buyer ? buyer.savedTalents.map(id => id.toString()) : [];

    // Build search filter
    let searchFilter = {};

    // Handle search query (only if no subcategories or category)
    if (searchQuery && searchQuery.trim() !== '' && !subcategories.length && !category) {
      const searchTerms = searchQuery.split(',').map(term => term.trim().toLowerCase());
      const serviceIdsFromSearch = searchTerms
        .map(term => subcategoryMap[term])
        .filter(id => id);

      searchFilter.$or = [
        { first_name: { $regex: searchQuery, $options: 'i' } },
        { last_name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { long_description: { $regex: searchQuery, $options: 'i' } },
      ];

      if (serviceIdsFromSearch.length > 0) {
        searchFilter.$or.push({ services: { $in: serviceIdsFromSearch } });
      }
    }

    // Handle subcategory and category filters
    let serviceIds = [];
    if (subcategories.length > 0) {
      // Map subcategories from filter modal
      serviceIds = subcategories
        .map(sub => {
          const normalizedSub = sub.toLowerCase().trim();
          return subcategoryMap[normalizedSub] || subcategoryMap[normalizedSub.replace(/\s+/g, '-')];
        })
        .filter(id => id);
      // console.log('Mapped subcategory IDs from filter:', serviceIds);
      if (serviceIds.length === 0 && subcategories.length > 0) {
        console.warn('No valid subcategory IDs found for:', subcategories);
        return res.status(400).json({
          success: false,
          message: 'Invalid subcategories provided.',
        });
      }
    } else if (category) {
      // Handle single category from browse-by-category
      const categoryKey = category.toLowerCase().trim();
      const serviceId = subcategoryMap[categoryKey] || subcategoryMap[categoryKey.replace(/\s+/g, '-')];
      if (serviceId) {
        serviceIds.push(serviceId);
      } else {
        console.warn('No valid subcategory ID found for category:', category);
        return res.status(400).json({
          success: false,
          message: `Invalid category: ${category}.`,
        });
      }
    }

    if (serviceIds.length > 0) {
      searchFilter.services = { $in: serviceIds };
    }

    // Handle price range filter
    if (priceRange.length > 0) {
      const priceFilters = priceRange.map(range => {
        switch (range.trim()) {
          case 'Less than $100':
            return { 'price_range.min': { $lte: 100 } };
          case '$100 to $500':
            return { 'price_range.min': { $gte: 100, $lte: 500 } };
          case '$500 to $1K':
            return { 'price_range.min': { $gte: 500, $lte: 1000 } };
          case '$1K to $5K':
            return { 'price_range.min': { $gte: 1000, $lte: 5000 } };
          case '$5K+':
            return { 'price_range.min': { $gte: 5000 } };
          default:
            return null;
        }
      }).filter(filter => filter);
      if (priceFilters.length > 0) {
        searchFilter.$or = searchFilter.$or
          ? [...searchFilter.$or, ...priceFilters]
          : priceFilters;
      }
    }

    // Handle genres filter
    if (genres.length > 0) {
      const genreIds = genres
        .map(name => getGenreIdByName(name.trim()))
        .filter(id => id);
      if (genreIds.length > 0) {
        searchFilter.genres = { $in: genreIds };
      } else {
        console.warn('No valid genre IDs found for:', genres);
      }
    }

    // Handle languages filter
    if (languages.length > 0) {
      const languageIds = languages
        .map(name => getLanguageIdByName(name.trim()))
        .filter(id => id);
      if (languageIds.length > 0) {
        searchFilter.languages = { $in: languageIds };
      } else {
        console.warn('No valid language IDs found for:', languages);
      }
    }

    // Handle gender filter
    if (gender.length > 0) {
      const genderIds = gender
        .map(name => getGenderIdByName(name.trim()))
        .filter(id => id);
      if (genderIds.length > 0) {
        searchFilter.gender = { $in: genderIds };
      } else {
        console.warn('No valid gender IDs found for:', gender);
      }
    }

    // Handle badge filter
    if (badge.length > 0) {
      const badgeIds = badge
        .map(label => BADGES.find(b => b.label === label.trim())?.id)
        .filter(id => id);
      if (badgeIds.length > 0) {
        searchFilter.badge = { $in: badgeIds };
      } else {
        console.warn('No valid badge IDs found for:', badge);
      }
    }

    // Handle availability date filter (exclude unavailable dates)
    if (availabilityDate) {
      const date = new Date(availabilityDate);
      if (!isNaN(date.getTime())) {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        searchFilter.availability = { $nin: [startOfDay] };
      } else {
        console.warn('Invalid availability date:', availabilityDate);
      }
    }

    // Handle zip code and range filter (approximate with zip code prefix)
    if (zipCode) {
      // const zipRegex = new RegExp(`^${zipCode.slice(0, 3)}`);
      // searchFilter.zip_code = zipRegex;
      searchFilter.zip_code = zipCode;

      // console.log('Applied zip code filter:', zipRegex);
    }
//     if (zipCode) {
//   searchFilter.zip_code = { $regex: `^${zipCode}`, $options: "i" };
// }


    // Define categoryMap for specific sections
    const categoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach(sub => {
        const categoryKey = sub.name.toLowerCase().replace(/\s+/g, '-');
        acc[categoryKey] = { services: { $in: [sub.subcategory_id] } };
      });
      return acc;
    }, {
      'rising-talent': { badge: BADGES.find(badge => badge.label === 'Rising Talent').id },
      'top-rated': {
        badge: {
          $in: [
            BADGES.find(badge => badge.label === 'Top Rated').id,
            BADGES.find(badge => badge.label === 'Top Rated Plus').id,
          ],
        },
      },
    });

    if (category && categoryMap[category.toLowerCase()] && !serviceIds.length) {
      const categoryFilter = categoryMap[category.toLowerCase()];
      searchFilter = { ...searchFilter, ...categoryFilter };
      // console.log('Applied category filter:', categoryFilter);
    }

    // console.log('Final search filter:', JSON.stringify(searchFilter, null, 2));

    // Map seller to talent with labels and colors
    const mapSellerToTalent = (seller) => {
      // console.log(`Seller ID: ${seller._id}, Raw badge: ${seller.badge}`);
      const isFavorite = savedTalents.includes(seller._id.toString());

      const now = new Date();
      const activeStories = (seller.stories || []).filter(story => {
        const storyDate = new Date(story.created_at);
        const hoursDiff = (now - storyDate) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      });

      return {
        id: seller._id.toString(),
        name: `${seller.first_name} ${seller.last_name || ''}`.trim(),
        location: `${seller.city || 'Unknown'}, ${seller.zip_code || 'Unknown'}`,
        rating: seller.rating || 4.5,
        reviews: seller.reviews || 0,
        price: seller.price_range?.min ? `$${seller.price_range.min}` : '$100',
        description: seller.description || 'No description available',
        image: seller.image || 'http://192.168.29.179:5000/stories/profile1.png',
        tags: Array.isArray(seller.services)
          ? seller.services.map(id => subcategoryMap[id] || 'Unknown')
          : ['Unknown'],
        hasStatus: activeStories.length > 0,
        badge: getBadgeLabelById(seller.badge) || 'New',
        badgeColor: getBadgeColorById(seller.badge) || 'bg-gray-500',
        buttonText: 'Hire Talent',
        buttonColor: getBadgeColorById(seller.badge) || 'bg-purple-500',
        stories: activeStories,
        services: seller.services || [],
        genres: Array.isArray(seller.genres)
          ? seller.genres.map(id => getGenreNameById(id)).filter(name => name)
          : [],
        languages: Array.isArray(seller.languages)
          ? seller.languages.map(id => getLanguageNameById(id)).filter(name => name)
          : [],
        gender: Array.isArray(seller.gender)
          ? seller.gender.map(id => getGenderNameById(id)).filter(name => name)
          : [],
        isFavorite, // Add isFavorite field
      };
    };

    let responseData = {};
    let pagination = {};

    if (section === 'home') {
      const risingTalents = await Seller.find({ badge: BADGES.find(badge => badge.label === 'Rising Talent').id })
        .select('-password')
        .limit(4)
        .sort({ createdAt: -1 });
      const topRatedTalents = await Seller.find({
        badge: {
          $in: [
            BADGES.find(badge => badge.label === 'Top Rated').id,
            BADGES.find(badge => badge.label === 'Top Rated Plus').id,
          ],
        },
      })
        .select('-password')
        .limit(3)
        .sort({ createdAt: -1 });
      const browseTalents = await Seller.find({})
        .select('-password')
        .limit(3)
        .sort({ createdAt: -1 });

      responseData = {
        risingTalents: risingTalents.map(mapSellerToTalent),
        topRatedTalents: topRatedTalents.map(mapSellerToTalent),
        browseTalents: browseTalents.map(mapSellerToTalent),
      };
    } else {
      const totalSellers = await Seller.countDocuments(searchFilter);
      // console.log('Total sellers found:', totalSellers);

      const sellers = await Seller.find(searchFilter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // console.log('Sellers returned:', sellers.length);

      const totalPages = Math.ceil(totalSellers / limit);
      responseData = sellers.map(mapSellerToTalent);
      pagination = {
        currentPage: page,
        totalPages,
        totalItems: totalSellers,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    }

    res.status(200).json({
      success: true,
      data: responseData,
      pagination: section === 'home' ? undefined : pagination,
      debug: {
        searchFilter,
        category,
        searchQuery,
        subcategories,
        serviceIds,
        priceRange,
        genres,
        languages,
        gender,
        badge,
        availabilityDate,
        zipCode,
        range,
      },
    });
  } catch (error) {
    console.error('Get Sellers error:', error);
    res.status(400).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// // GET: Fetch Sellers by Category with Pagination
// exports.getSellersByCategory = async (req, res) => {
//   try {
//     const { category } = req.params;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
    
//     // Map category to service ID
//     const categoryMap = {
//       'rising-talent': { badge: 2 }, // BADGE_RISING_TALENT
//       'top-rated': { badge: { $in: [3, 4] } }, // BADGE_TOP_RATED and BADGE_TOP_RATED_PLUS
//       'singer': { services: { $in: [1, 4] } },
//       'guitarist': { services: { $in: [2, 5] } },
//       'drummer': { services: { $in: [3, 6, 7] } }
//     };
    
//     const filter = categoryMap[category] || {};
    
//     // Get total count
//     const totalSellers = await Seller.countDocuments(filter);
    
//     // Fetch sellers
//     const sellers = await Seller.find(filter)
//       .select('-password')
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });
    
//     const now = new Date();
//     const sellersWithActiveStories = sellers.map(seller => {
//       const activeStories = seller.stories.filter(story => {
//         const storyDate = new Date(story.created_at);
//         const hoursDiff = (now - storyDate) / (1000 * 60 * 60);
//         return hoursDiff <= 24;
//       });
//       return { ...seller.toObject(), stories: activeStories };
//     });
    
//     const totalPages = Math.ceil(totalSellers / limit);
    
//     res.status(200).json({ 
//       success: true, 
//       data: sellersWithActiveStories,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalItems: totalSellers,
//         itemsPerPage: limit,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1
//       }
//     });
//   } catch (error) {
//     console.error('Get Sellers by Category error:', error);
//     res.status(400).json({ success: false, message: 'Server error.' });
//   }
// };

// GET: Fetch Seller by ID
// exports.getSellerById = async (req, res) => {
//   try {
//     const categories = await Category.find();
//     const subcategoryMap = categories.reduce((acc, cat) => {
//       cat.subcategories.forEach(sub => {
//         acc[sub.subcategory_id] = sub.name;
//       });
//       return acc;
//     }, {});

//     const seller = await Seller.findById(req.params.id).select('-password');
//     if (!seller) {
//       return res.status(404).json({
//         success: false,
//         message: 'Seller not found',
//       });
//     }

//     const sellerData = {
//       id: seller._id.toString(),
//       first_name: seller.first_name,
//       last_name: seller.last_name,
//       username: seller.username,
//       email: seller.email,
//       phone: seller.phone,
//       city: seller.city,
//       zip_code: seller.zip_code,
//       price_range: seller.price_range,
//       badge: getBadgeLabelById(seller.badge) || 'New',
//       badgeColor: getBadgeColorById(seller.badge) || 'bg-gray-500',
//       availability: seller.availability,
//       description: seller.description,
//       long_description: seller.long_description,
//       genres: Array.isArray(seller.genres)
//         ? seller.genres.map(id => getGenreNameById(id)).filter(name => name)
//         : [],
//       gender: Array.isArray(seller.gender)
//         ? seller.gender.map(id => getGenderNameById(id)).filter(name => name)
//         : [],
//       services: Array.isArray(seller.services)
//         ? seller.services.map(id => subcategoryMap[id] || 'Unknown')
//         : [],
//       languages: Array.isArray(seller.languages)
//         ? seller.languages.map(id => getLanguageNameById(id)).filter(name => name)
//         : [],
//       image: seller.image,
//       portfolio: seller.portfolio,
//       certificates: seller.certificates,
//       education: seller.education,
//       stories: seller.stories,
//       rating: seller.rating,
//       reviews: seller.reviews,
//       createdAt: seller.createdAt,
//       updatedAt: seller.updatedAt,
//     };
    


//     res.status(200).json({
//       success: true,
//       data: sellerData,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       error: error.message,
//     });
//   }
 
// };


// GET: Fetch Seller by ID
exports.getSellerById = async (req, res) => {
  try {
    // Fetch categories and create subcategory map
    const categories = await Category.find();
    const subcategoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach(sub => {
        acc[sub.subcategory_id] = sub.name;
      });
      return acc;
    }, {});

    // In getSellerById, add this check:
const isOwnProfile = req.user && req.user.toString() === req.params.id;

    // Fetch buyer’s savedTalents for isFavorite
     //Only fetch buyer data if NOT viewing own profile
    const buyerId = !isOwnProfile && req.user ? req.user : null;
    // const buyerId = req.user ? req.user : null;
    const buyer = buyerId ? await Buyer.findById(buyerId).select('savedTalents') : null;
    const savedTalents = buyer ? buyer.savedTalents.map(id => id.toString()) : [];

    // Fetch seller by ID
    const seller = await Seller.findById(req.params.id).select('-password');
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found',
      });
    }

    // Filter active stories (within 24 hours)
    const now = new Date();
    const activeStories = (seller.stories || []).filter(story => {
      const storyDate = new Date(story.created_at);
      const hoursDiff = (now - storyDate) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    // Map seller data to frontend format
    const sellerData = {
      id: seller._id.toString(),
      name: `${seller.first_name} ${seller.last_name || ''}`.trim(),
      
      username: seller.username,
      email: seller.email,
      phone: seller.phone,
      city: seller.city || 'Unknown',
      zip_code: seller.zip_code || '00000',
      price_range: seller.price_range
        ? { min: seller.price_range.min, max: seller.price_range.max }
        : { min: 0, max: 0 },
      badge: getBadgeLabelById(seller.badge) || 'New',
      badgeColor: getBadgeColorById(seller.badge) || 'bg-gray-500',
      availability: seller.availability || [],
      description: seller.description || 'No description available',
      long_description: seller.long_description || '<p>No description available</p>',
      genres: Array.isArray(seller.genres)
        ? seller.genres.map(id => getGenreNameById(id)).filter(name => name)
        : [],
      // gender: Array.isArray(seller.gender)
      //   ? seller.gender.map(id => getGenderNameById(id)).filter(name => name)
      //   : [],
      gender: seller.gender || [],
      state: seller.state || null,
      services: Array.isArray(seller.services)
        ? seller.services.map(id => subcategoryMap[id] || 'Unknown')
        : [],
      languages: Array.isArray(seller.languages)
        ? seller.languages.map(id => getLanguageNameById(id)).filter(name => name)
        : [],
      image: seller.image || 'http://192.168.29.179:5000/stories/profile1.png',
      portfolio: seller.portfolio || [], // Include full portfolio array
      certificates: seller.certificates || [],
      education: seller.education || [],
      stories: activeStories,
      rating: seller.rating || 4.5,
      reviews: seller.reviews || 0,
      created_at: seller.created_at,
      updated_at: seller.updated_at,
      // isFavorite: savedTalents.includes(seller._id.toString()),
      isFavorite: isOwnProfile ? false : savedTalents.includes(seller._id.toString()),
    };

    res.status(200).json({
      success: true,
      data: sellerData,
    });
  } catch (error) {
    console.error('Get Seller by ID error:', error);
    res.status(400).json({
      success: false,
      message: 'Server error.',
      error: error.message,
    });
  }
};

// PUT: Edit Seller

// const validator = require('validator');
// const bcrypt = require('bcryptjs');
// const path = require('path');
const fs = require('fs').promises;
// const Seller = require('../models/Seller');
// const Category = require('../models/category');
// const { LANGUAGES, GENRES, GENDERS, BADGES } = require('../utils/constants');



// PUT: Edit Seller with File Upload Support
exports.editSeller = async (req, res) => {
  try {
    // Validate seller ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid seller ID.' });
    }

    // Ensure authenticated user matches seller ID
    if (req.user.userId.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this seller.' });
    }

    // Extract fields from request body
    const {
      first_name,
      last_name,
      username,
      email,
      phone,
      city,
      state,
      zip_code,
      password,
      description,
      long_description,
      certificates,
      education,
      price_range,
      services,
      languages,
      genres,
      gender,
      badge,
      availability,
      existingPortfolio,
      deletedPortfolio,
      existingStories,
      deletedStories,
    } = req.body;

    // Log received long_description for debugging
    console.log('Received long_description:', long_description);

    // Sanitize string inputs (exclude long_description)
    const sanitized = {
      first_name: validator.trim(first_name || ''),
      last_name: validator.trim(last_name || ''),
      username: validator.trim(username || ''),
      email: validator.trim(email || ''),
      phone: validator.trim(phone || ''),
      city: validator.trim(city || ''),
      state: validator.trim(state || ''),
      zip_code: validator.trim(zip_code || ''),
      password: validator.trim(password || ''),
      description: validator.trim(description || ''),
    };
    for (let key in sanitized) {
      sanitized[key] = validator.escape(sanitized[key]);
    }

    // Sanitize long_description with sanitize-html
    const sanitizedLongDescription = long_description
      ? sanitizeHtml(long_description.trim(), {
          allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'br'],
          allowedAttributes: { 'li': ['style'], 'p': ['style'], 'strong': ['style'] },
        })
      : '';

    console.log('Sanitized long_description:', sanitizedLongDescription);

    // Parse JSON fields
    let parsedPriceRange, parsedServices, parsedLanguages, parsedGenres, parsedCertificates, parsedEducation, parsedGender;
    try {
      parsedPriceRange = price_range ? JSON.parse(price_range) : undefined;
      parsedServices = services ? JSON.parse(services) : undefined;
      parsedLanguages = languages ? JSON.parse(languages) : undefined;
      parsedGenres = genres ? JSON.parse(genres) : [];
      parsedCertificates = certificates ? JSON.parse(certificates) : undefined;
      parsedEducation = education ? JSON.parse(education) : undefined;
      parsedGender = gender ? JSON.parse(gender) : undefined;
    } catch (error) {
      console.error('JSON parsing error:', error);
      return res.status(400).json({ success: false, message: `Invalid JSON format: ${error.message}` });
    }

    // Validate required fields
    if (!sanitized.first_name) return res.status(400).json({ success: false, message: 'First name is required.' });
    if (!sanitized.username) return res.status(400).json({ success: false, message: 'Username is required.' });
    if (!sanitized.email) return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!sanitized.city) return res.status(400).json({ success: false, message: 'City is required.' });
    if (!sanitized.zip_code) return res.status(400).json({ success: false, message: 'Zip code is required.' });

    // Validate fields
    if (sanitized.first_name.length < 2) return res.status(400).json({ success: false, message: 'First name must be at least 2 characters.' });
    if (sanitized.username.length < 3) return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    if (!/^[a-zA-Z0-9_]+$/.test(sanitized.username)) return res.status(400).json({ success: false, message: 'Username can only contain letters, numbers, and underscores.' });
    if (!validator.isEmail(sanitized.email)) return res.status(400).json({ success: false, message: 'Invalid email.' });
    if (sanitized.phone && !/^\d{10}$/.test(sanitized.phone)) return res.status(400).json({ success: false, message: 'Phone must be a 10-digit number.' });
    if (sanitized.zip_code && !/^\d{5,6}$/.test(sanitized.zip_code)) return res.status(400).json({ success: false, message: 'Zip code must be 5 or 6 digits.' });
    if (sanitized.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(sanitized.password)) {
        return res.status(400).json({ success: false, message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character.' });
      }
    }

    // Validate price_range
    if (parsedPriceRange && (!parsedPriceRange.min || !parsedPriceRange.max || parsedPriceRange.min < 0 || parsedPriceRange.max < parsedPriceRange.min)) {
      return res.status(400).json({ success: false, message: 'Invalid price range: min and max must be provided, non-negative, and max >= min.' });
    }

    // Validate services
    if (!parsedServices || !Array.isArray(parsedServices) || parsedServices.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one valid service must be provided.' });
    }
    const categories = await Category.find();
    const validServiceIds = categories.flatMap(cat => cat.subcategories.map(sub => sub.subcategory_id));
    const uniqueServices = [...new Set(parsedServices)];
    if (!uniqueServices.every(id => validServiceIds.includes(id))) {
      console.log('Valid Service IDs:', validServiceIds, 'Received Services:', parsedServices);
      return res.status(400).json({ success: false, message: 'Invalid service IDs provided.' });
    }
    parsedServices = uniqueServices;

    // Validate languages
    if (parsedLanguages && (!Array.isArray(parsedLanguages) || !parsedLanguages.every(id => LANGUAGES.map(lang => lang.id).includes(id)))) {
      console.log('Invalid languages:', parsedLanguages);
      return res.status(400).json({ success: false, message: 'Invalid language IDs provided.' });
    }

    // Validate genres
    if (parsedGenres && (!Array.isArray(parsedGenres) || !parsedGenres.every(id => GENRES.map(genre => genre.id).includes(id)))) {
      console.log('Invalid genres:', parsedGenres);
      return res.status(400).json({ success: false, message: 'Invalid genre IDs provided.' });
    }

    // Validate gender (mandatory, single value)
    if (!parsedGender || !Array.isArray(parsedGender) || parsedGender.length !== 1 || !GENDERS.map(g => g.id).includes(parsedGender[0])) {
      console.log('Gender validation failed:', parsedGender);
      return res.status(400).json({ success: false, message: 'Gender must be a single valid ID (1 for Male, 2 for Female, 3 for Other).' });
    }

    // Validate badge
    if (badge && !BADGES.map(b => b.id).includes(parseInt(badge))) {
      return res.status(400).json({ success: false, message: 'Invalid badge value.' });
    }

    // Validate availability
    let parsedAvailability = availability;
    if (availability && typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid availability format.' });
      }
    }
    if (parsedAvailability && (!Array.isArray(parsedAvailability) || !parsedAvailability.every(date => validator.isISO8601(date)))) {
      return res.status(400).json({ success: false, message: 'Availability must be an array of valid ISO 8601 dates.' });
    }

    // Validate certificates
    if (parsedCertificates && (!Array.isArray(parsedCertificates) || !parsedCertificates.every(cert => cert.name && validator.isISO8601(cert.date) && cert.institution))) {
      return res.status(400).json({ success: false, message: 'Each certificate must include name, valid ISO 8601 date, and institution.' });
    }

    // Validate education
    if (parsedEducation && (!Array.isArray(parsedEducation) || !parsedEducation.every(edu => edu.degree && validator.isISO8601(edu.date) && edu.institution))) {
      return res.status(400).json({ success: false, message: 'Each education record must include degree, valid ISO 8601 date, and institution.' });
    }

    // Parse and validate portfolio/stories
    let existingPortfolioArray = [];
    if (existingPortfolio && existingPortfolio.trim() !== '') {
      try {
        existingPortfolioArray = JSON.parse(existingPortfolio);
        if (!Array.isArray(existingPortfolioArray)) {
          throw new Error('Existing portfolio must be an array');
        }
        if (!existingPortfolioArray.every(p => p.url && (p.url.startsWith('http://192.168.29.179:5000/uploads/') || p.url.startsWith('http')) && p.title && ['video', 'audio', 'image'].includes(p.type))) {
          return res.status(400).json({ success: false, message: 'Portfolio items must have valid URL, title, and type (video/audio/image).' });
        }
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid existing portfolio format.' });
      }
    }

    let deletedPortfolioArray = [];
    if (deletedPortfolio && deletedPortfolio.trim() !== '') {
      try {
        deletedPortfolioArray = JSON.parse(deletedPortfolio);
        if (!Array.isArray(deletedPortfolioArray)) {
          throw new Error('Deleted portfolio must be an array');
        }
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid deleted portfolio format.' });
      }
    }

    let existingStoriesArray = [];
    if (existingStories && existingStories.trim() !== '') {
      try {
        existingStoriesArray = JSON.parse(existingStories);
        if (!Array.isArray(existingStoriesArray)) {
          throw new Error('Existing stories must be an array');
        }
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid existing stories format.' });
      }
    }

    let deletedStoriesArray = [];
    if (deletedStories && deletedStories.trim() !== '') {
      try {
        deletedStoriesArray = JSON.parse(deletedStories);
        if (!Array.isArray(deletedStoriesArray)) {
          throw new Error('Deleted stories must be an array');
        }
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid deleted stories format.' });
      }
    }

    // Process uploaded files
    const imageFile = req.files['image'] ? `http://192.168.29.179:5000/uploads/${req.files['image'][0].filename}` : undefined;
    // const portfolioFiles = req.files['portfolio'] || [];
    const storyFiles = req.files['stories'] || [];

    const portfolioFiles = req.files['portfolio'] || [];
    const newPortfolio = portfolioFiles.map((file, index) => {
      let title, type, location;
      // Check if portfolio is sent as an array in req.body
      if (Array.isArray(req.body.portfolio) && req.body.portfolio[index]) {
        title = validator.trim(String(req.body.portfolio[index].title || ''));
        location = validator.trim(String(req.body.portfolio[index].location || ''));
        type = String(req.body.portfolio[index].type || (file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('audio') ? 'audio' : 'image'));
      } else {
        // Fallback to individual fields
        const titleKey = `portfolio[${index}][title]`;
        title = validator.trim(String(req.body[titleKey] || ''));
        location = validator.trim(String(req.body[`portfolio[${index}][location]`] || ''));
        type = String(req.body[`portfolio[${index}][type]`] || (file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('audio') ? 'audio' : 'image'));
      }
      console.log(`Portfolio[${index}] - title: ${title}, type: ${type}, location: ${location}`); // Debug
      if (!title) {
        console.log('Full req.body:', JSON.stringify(req.body, null, 2)); // Log full body
        throw new Error(`Portfolio item at index ${index} must have a title`);
      }
      if (!['video', 'audio', 'image'].includes(type)) {
        throw new Error(`Invalid portfolio item type at index ${index}`);
      }
      return {
        url: `http://192.168.29.179:5000/uploads/${file.filename}`,
        title,
        location,
        type,
      };
    });

    const newStories = storyFiles.map((file, index) => ({
      url: `http://192.168.29.179:5000/uploads/${file.filename}`,
      type: req.body[`stories[${index}][type]`] || (file.mimetype.startsWith('video') ? 'video' : 'image'),
      created_at: new Date(),
    }));

    const portfolio = [
      ...existingPortfolioArray.filter(p => !deletedPortfolioArray.includes(p.url)),
      ...newPortfolio,
    ];

    const stories = [
      ...existingStoriesArray.filter(s => !deletedStoriesArray.includes(s.url)),
      ...newStories,
    ];

    if (portfolio.length > 0 && !portfolio.every(p => p.url && p.title && ['video', 'audio', 'image'].includes(p.type))) {
      return res.status(400).json({ success: false, message: 'Portfolio must contain valid url, title, and type (video/audio/image).' });
    }

    if (stories.length > 0 && !stories.every(s => s.url && ['video', 'image'].includes(s.type))) {
      return res.status(400).json({ success: false, message: 'Stories must be an array of objects with valid url and type (video/image).' });
    }

    // Delete physical files
    for (const url of [...deletedPortfolioArray, ...deletedStoriesArray]) {
      if (url.startsWith('http://192.168.29.179:5000/uploads/')) {
        const filePath = path.join(__dirname, '../', url);
        try {
          const otherSellersUsingFile = await Seller.find({
            _id: { $ne: req.params.id },
            $or: [
              { image: url },
              { 'portfolio.url': url },
              { 'stories.url': url },
            ],
          });
          if (otherSellersUsingFile.length === 0) {
            await fs.unlink(filePath);
            console.log(`Successfully deleted file: ${filePath}`);
          }
        } catch (error) {
          console.log(`File not found or already deleted: ${filePath}`);
        }
      }
    }

    // Check for existing seller with unique fields
    const existing = await Seller.findOne({
      $and: [
        { _id: { $ne: req.params.id } },
        {
          $or: [
            { username: sanitized.username || undefined },
            { email: sanitized.email || undefined },
            { phone: sanitized.phone || undefined },
          ],
        },
      ],
    });
    if (existing) return res.status(400).json({ success: false, message: 'Username, email, or phone already exists.' });

    // Prepare update object
    const update = {
      first_name: sanitized.first_name || undefined,
      last_name: sanitized.last_name || undefined,
      username: sanitized.username || undefined,
      email: sanitized.email || undefined,
      phone: sanitized.phone || undefined,
      city: sanitized.city || undefined,
      state: sanitized.state || undefined,
      zip_code: sanitized.zip_code || undefined,
      description: sanitized.description || undefined,
      long_description: sanitizedLongDescription,
      certificates: parsedCertificates || undefined,
      education: parsedEducation || undefined,
      price_range: parsedPriceRange || undefined,
      services: parsedServices || undefined,
      languages: parsedLanguages || undefined,
      genres: parsedGenres || undefined,
      gender: parsedGender, // Required
      badge: badge ? parseInt(badge) : undefined,
      availability: parsedAvailability || undefined,
      image: imageFile || undefined,
      portfolio: portfolio.length > 0 ? portfolio : undefined,
      stories: stories.length > 0 ? stories : undefined,
    };

    if (sanitized.password) {
      update.password = await bcrypt.hash(sanitized.password, 10);
    }

    Object.keys(update).forEach(key => key !== 'gender' && update[key] === undefined && delete update[key]);

    // Update seller
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-password');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });

    res.status(200).json({ success: true, data: seller });
  } catch (error) {
    console.error('Edit Seller error:', error);
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// DELETE: Delete Seller
exports.deleteSeller = async (req, res) => {
  try {
    // Ensure authenticated user matches seller ID
    if (req.user !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this seller.' });
    }

    const seller = await Seller.findByIdAndDelete(req.params.id);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });
    res.status(200).json({ success: true, message: 'Seller deleted successfully.' });
  } catch (error) {
    console.error('Delete Seller error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET: Fetch Seller Stories
exports.getStories = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findById(id).select('stories');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });

    // Filter stories created within the last 24 hours
    const now = new Date();
    const activeStories = seller.stories.filter(story => {
      const storyDate = new Date(story.created_at);
      const hoursDiff = (now - storyDate) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    res.status(200).json({ success: true, data: activeStories });
  } catch (error) {
    console.error('Get Stories error:', error);
    res.status(400).json({ success: false, error: error.message || 'Server error.' });
  }
};



exports.availability = async (req, res) => {
  try {
    // Ensure authenticated user matches seller ID
    if (req.user !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to update this seller’s availability.' });
    }

    const { unavailableDates } = req.body; // Array of dates, e.g., ["2025-06-12", "2025-06-16"]

    // Validate input
    if (!Array.isArray(unavailableDates) || unavailableDates.length === 0) {
      return res.status(400).json({ message: 'unavailableDates must be a non-empty array.' });
    }

    // Validate each date
    for (const date of unavailableDates) {
      if (!validator.isISO8601(date)) {
        return res.status(400).json({ message: `Invalid date format: ${date}. Use ISO 8601 format.` });
      }
    }

    // Update seller's availability
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { $set: { availability: unavailableDates.map(date => new Date(date)) } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully.',
      data: seller.availability,
    });
  } catch (error) {
    console.error('Update Availability error:', error);
    res.status(400).json({ success: false, error: error.message || 'Server error.' });
  }
}; 