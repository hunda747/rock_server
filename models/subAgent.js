// models/Shop.js
const { Model } = require('objection');

class Subagents extends Model {
  static get tableName() {
    return 'sub_agents';
  }
  
  static get relationMappings() {
    const ShopOwner = require('./ShopOwner');
    return {
      owner: {
        modelClass: ShopOwner,
        relation: Model.BelongsToOneRelation,
        join: {
          from: 'sub_agents.shopOwnerId',
          to: 'shop_owners.id',
        },
      },
    };
  }
}

module.exports = Subagents;
