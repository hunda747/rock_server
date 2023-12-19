// models/Game.js

const { Model } = require('objection');

class Game extends Model {
  static get tableName() {
    return 'games';
  }

  // static get jsonSchema() {
  //   return {
  //     type: 'object',
  //     properties: {
  //       id: { type: 'string', format: 'uuid' },
  //       gameType: { type: 'string', maxLength: 10 },
  //       pickedNumbers: { type: 'array' },
  //       time: { type: 'string', format: 'date-time' },
  //       // Add other properties and validations as needed
  //     },
  //   };
  // }
}

module.exports = Game;
