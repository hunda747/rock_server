// models/Cashier.js
const { Model } = require('objection');

class Cashier extends Model {
  static get tableName() {
    return 'cashiers';
  }
  
  static get relationMappings() {
    const Shop = require('./shop');
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

  // Exclude password field from JSON representation
  $formatJson(json) {
    json = super.$formatJson(json);
    delete json.password;
    return json;
  }
}

module.exports = Cashier;
