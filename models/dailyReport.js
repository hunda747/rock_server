// models/Slip.js

const { Model } = require('objection');
const Game = require('./game');
const Shop = require('./shop');
const Cashier = require('./cashier');

class Daily_reports extends Model {
  static get tableName() {
    return 'daily_reports';
  }

  static get relationMappings() {
    return {
      game: {
        relation: Model.BelongsToOneRelation,
        modelClass: Game,
        join: {
          from: 'slips.gameId',
          to: 'games.id',
        },
      },
      shop: {
        relation: Model.BelongsToOneRelation,
        modelClass: Shop,
        join: {
          from: 'slips.shopId',
          to: 'shops.id',
        }
      },
      cashier: {
        relation: Model.BelongsToOneRelation,
        modelClass: Cashier,
        join: {
          from: 'slips.cashierId',
          to: 'cashiers.id',
        },
      },
    }
  }
}
module.exports = Daily_reports;