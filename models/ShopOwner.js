// models/ShopOwner.js
const { Model } = require('objection');

class ShopOwner extends Model {
  static get tableName() {
    return 'shop_owners';
  }

  // Exclude password field from JSON representation
  $formatJson(json) {
    json = super.$formatJson(json);
    delete json.password;
    return json;
  }
}

module.exports = ShopOwner;
