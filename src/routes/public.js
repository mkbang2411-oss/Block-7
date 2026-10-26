// ===== TRANG NGƯỜI DÙNG (chỉ đọc) =====
const express = require('express');
const { Sequelize, Op } = require('sequelize');
const { Dish, Chef, Ingredient } = require('../models');
const { parseId, asyncHandler } = require('../utils/format');

const router = express.Router();

// GET /dishes?q=...  -> danh sách món, tìm theo tên bằng query q
router.get(
  '/dishes',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const options = { include: [{ model: Chef, as: 'chef' }], order: [['name', 'ASC']] };
    if (q) {
      options.where = Sequelize.where(Sequelize.fn('lower', Sequelize.col('Dish.name')), {
        [Op.like]: `%${q.toLowerCase()}%`,
      });
    }
    const dishes = await Dish.findAll(options);
    res.render('public/dishes', { dishes, q });
  })
);

// GET /dishes/:id -> chi tiết đủ các trường; id sai hoặc không có -> 404
router.get(
  '/dishes/:id',
  asyncHandler(async (req, res, next) => {
    const id = parseId(req.params.id);
    if (!id) return next();
    const dish = await Dish.findByPk(id, {
      include: [
        { model: Chef, as: 'chef' },
        { model: Ingredient, as: 'ingredients' },
      ],
    });
    if (!dish) return next();
    res.render('public/dish-detail', { dish });
  })
);

module.exports = router;
