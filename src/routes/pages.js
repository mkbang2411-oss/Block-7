// ===== TRANG CHỦ (phố) + TRANG KHÁCH (bàn tròn chọn món) =====
//   GET /       phố Ba Cô Gái, bấm vào quán để chọn vai
//   GET /khach  bàn tròn xoay các món LẤY TỪ DATABASE
const express = require('express');
const { Dish, Chef, Ingredient } = require('../models');
const { taoPho } = require('../utils/pho');
const { asyncHandler, dishIcon } = require('../utils/format');

const router = express.Router();

router.get('/', (req, res) => res.render('home', { pho: taoPho() }));

router.get(
  '/khach',
  asyncHandler(async (req, res) => {
    const dishes = await Dish.findAll({
      include: [
        { model: Chef, as: 'chef' },
        { model: Ingredient, as: 'ingredients' },
      ],
      order: [['id', 'ASC']],
    });
    // chỉ gửi xuống trình duyệt những trường cần để vẽ vòng món
    const mon = dishes.map((d) => ({
      id: d.id,
      ten: d.name,
      gia: Number(d.price),
      icon: dishIcon(d),
      moTa: d.description || '',
      loai: d.category,
      conBan: d.available,
      dauBep: d.chef ? d.chef.name : '',
      nguyenLieu: d.ingredients.map((i) => ({ ten: i.name, donVi: i.unit })),
    }));
    res.render('khach', { mon });
  })
);

module.exports = router;
