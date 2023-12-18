// models/Shop.js
const { Model } = require('objection');
const ShopOwner = require('./ShopOwner');

class Shop extends Model {
  static get tableName() {
    return 'shops';
  }

  static get relationMappings() {
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: ShopOwner,
        join: {
          from: 'shops.shopOwnerId',
          to: 'shop_owners.id',
        },
      },
    };
  }
}

module.exports = Shop;
