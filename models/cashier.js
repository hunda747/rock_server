// models/Cashier.js
const { Model } = require('objection');
const Shop = require('./shop');

class Cashier extends Model {
  static get tableName() {
    return 'cashiers';
  }

  static get relationMappings() {
    return {
      shop: {
        relation: Model.BelongsToOneRelation,
        modelClass: Shop,
        join: {
          from: 'cashiers.shopId',
          to: 'shops.id',
        },
      },
    };
  }
}

module.exports = Cashier;
