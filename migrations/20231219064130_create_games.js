/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// create_games_table.js

exports.up = function (knex) {
  return knex.schema.createTable('games', function (table) {
    table.increments('id').primary();
    table.integer('gameNumber', 20).notNullable();
    table.string('gameType', 20).notNullable();
    table.jsonb('pickedNumbers');
    table.enu('winner', ['evens', 'heads', 'tails']);
    table.timestamp('time');
    table.enu('status', ['playing', 'done', 'error']).defaultTo('playing');

    table.timestamps(true, true);
    // Add additional fields specific to each game type
    // For example, additional fields for keno and spin.
    // Replace the placeholders with the actual field names and data types.
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('games');
};
