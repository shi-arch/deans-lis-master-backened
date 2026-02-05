const mongoose = require('mongoose');
const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const Category = require('../models/category');

const { getBadgeLabelById, getBadgeColorById, getGenreNameById, getLanguageNameById, getGenderNameById } = require('../utils/constants');

// Toggle Like/Unlike a Seller
exports.toggleFavorite = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware
    const { sellerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ success: false, message: 'Invalid seller ID.' });
    }

    const user = await Buyer.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Buyer not found.' });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    const isFavorited = user.savedTalents.includes(sellerId);
    if (isFavorited) {
      user.savedTalents = user.savedTalents.filter(id => id.toString() !== sellerId);
    } else {
      user.savedTalents.push(sellerId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isFavorited ? 'Seller removed from saved talents.' : 'Seller added to saved talents.',
      isFavorited: !isFavorited,
    });
  } catch (error) {
    console.error('Toggle Favorite error:', error);
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};
exports.getSavedTalents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch buyer to get saved talents
    const user = await Buyer.findById(userId).select('savedTalents');
    if (!user) {
      console.error('Buyer not found for userId:', userId);
      return res.status(404).json({ success: false, message: 'Buyer not found.' });
    }

    // Fetch saved talents with pagination
    const totalSellers = user.savedTalents.length;
    const savedSellerIds = user.savedTalents.slice(skip, skip + limit); // Apply pagination to IDs
    const sellers = await Seller.find({ _id: { $in: savedSellerIds } }).select('-password');

    // Fetch categories for subcategory mapping
    const categories = await Category.find();
    const subcategoryMap = categories.reduce((acc, cat) => {
      cat.subcategories.forEach(sub => {
        acc[sub.subcategory_id] = sub.name;
      });
      return acc;
    }, {});

    // Map sellers to talent format
    const now = new Date();
    const savedTalents = sellers.map(seller => {
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
        buttonText: 'View Profile',
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
        isFavorite: true,
      };
    });

    const totalPages = Math.ceil(totalSellers / limit);

    res.status(200).json({
      success: true,
      data: savedTalents,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalSellers,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get Saved Talents error:', error);
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};