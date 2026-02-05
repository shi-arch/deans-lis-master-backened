const Category = require('../models/category');

// GET: Fetch all subcategories
exports.getSubcategories = async (req, res) => {
  try {
    const subcategories = await Category.aggregate([
      { $unwind: '$subcategories' },
      {
        $project: {
          _id: 0,
          subcategory_id: '$subcategories.subcategory_id',
          name: '$subcategories.name',
        },
      },
    ]);

    console.log('Subcategories:', subcategories);

    res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategories',
      error: error.message,
    });
  }
};


// GET: Fetch all categories with subcategories
exports.getCategoriesWithSubcategories = async (req, res) => {
  try {
    const categories = await Category.find().select('category_id name subcategories');

    const formattedCategories = categories.map(category => ({
      category_id: category.category_id,
      name: category.name,
      subcategories: category.subcategories.map(sub => ({
        subcategory_id: sub.subcategory_id,
        name: sub.name,
      })),
    }));

    console.log('Categories with subcategories:', formattedCategories);

    res.status(200).json({
      success: true,
      data: formattedCategories,
    });
  } catch (error) {
    console.error('Error fetching categories with subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};