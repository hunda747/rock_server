// models/Shop.js
const { Model } = require('objection');

class Shop extends Model {
  static get tableName() {
    return 'shops';
  }

  static get relationMappings() {
    const Cashier = require('./cashier');
    const ShopOwner = require('./ShopOwner');
    const Slip = require('./slip');
    return {
      cashiers: {
        modelClass: Cashier,
        relation: Model.HasManyRelation,
        join: {
          from: 'shops.id',
          to: 'cashiers.shopId',
        },
      },
      owner: {
        modelClass: ShopOwner,
        relation: Model.BelongsToOneRelation,
        join: {
          from: 'shops.shopOwnerId',
          to: 'shop_owners.id',
        },
      },
      slips: {
        relation: Model.HasManyRelation,
        modelClass: Slip,
        join: {
          from: 'shops.id',
          to: 'slips.shopId',
        },
      },
    };
  }
}

module.exports = Shop;
