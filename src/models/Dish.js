const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { CATEGORIES, LIMITS } = require('../constants');

const Dish = sequelize.define(
  'Dish',
  {
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true, len: [LIMITS.name.min, LIMITS.name.max] },
    },
    description: { type: DataTypes.TEXT, validate: { len: [0, LIMITS.description.max] } },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: LIMITS.price.min, max: LIMITS.price.max },
    },
    category: { type: DataTypes.STRING(60), allowNull: false, validate: { isIn: [CATEGORIES] } },
    available: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    imageUrl: { type: DataTypes.STRING(500) },
    imagePath: { type: DataTypes.STRING(200) },
  },
  { tableName: 'dishes' }
);

module.exports = Dish;