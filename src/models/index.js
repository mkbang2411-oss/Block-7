const sequelize = require('../config/database');
const Dish = require('./Dish');
const Chef = require('./Chef');
const Ingredient = require('./Ingredient');

// Mỗi món BẮT BUỘC có một đầu bếp; không xóa được đầu bếp còn đang phụ trách món (RESTRICT)
Chef.hasMany(Dish, { foreignKey: { name: 'chefId', allowNull: false }, as: 'dishes', onDelete: 'RESTRICT' });
Dish.belongsTo(Chef, { foreignKey: { name: 'chefId', allowNull: false }, as: 'chef' });

// Món ăn <-> nguyên liệu (nhiều-nhiều); xóa một bên thì bảng nối tự xóa theo
Dish.belongsToMany(Ingredient, {
  through: 'dish_ingredients',
  as: 'ingredients',
  foreignKey: 'dishId',
  otherKey: 'ingredientId',
});
Ingredient.belongsToMany(Dish, {
  through: 'dish_ingredients',
  as: 'dishes',
  foreignKey: 'ingredientId',
  otherKey: 'dishId',
});

module.exports = { sequelize, Dish, Chef, Ingredient };