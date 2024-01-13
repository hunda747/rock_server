// models/Slip.js

const { Model } = require('objection');
const Game = require('./game');
const Cashier = require('./cashier');

class Slip extends Model {
  static get tableName() {
    return 'slips';
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
      cashier: {
        relation: Model.BelongsToOneRelation,
        modelClass: Cashier,
        join: {
          from: 'slips.cashierId',
          to: 'cashiers.id',
        },
      },
    };
  }

  // static get jsonSchema() {
  //   return {
  //     type: 'object',
  //     properties: {
  //       id: { type: 'string', format: 'uuid' },
  //       gameId: { type: 'string', format: 'uuid' },
  //       netStake: { type: 'number', minimum: 0 },
  //       grossStake: { type: 'number', minimum: 0 },
  //       netWinning: { type: 'number', minimum: 0 },
  //       grossWinning: { type: 'number', minimum: 0 },
  //       numberPick: { type: 'array' },
  //       slipType: { type: 'string', maxLength: 10 },
  //       specialValue: { type: 'integer' },
  //       status: { type: 'string', maxLength: 20 },
  //       createdAt: { type: 'string', format: 'date-time' },
  //       // Add other properties and validations as needed
  //     },
  //   };
  // }
}

module.exports = Slip;
