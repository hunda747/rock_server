/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// create_slips_table.js

exports.up = function (knex) {
  return knex.schema.createTable('slips', function (table) {
    table.increments('id').primary();
    table.integer('gameId').unsigned().notNullable();
    table.foreign('gameId').references('games.id').onDelete('CASCADE');
    table.decimal('netStake', 10, 2);
    table.decimal('grossStake', 10, 2);
    table.decimal('netWinning', 10, 2);
    table.decimal('grossWinning', 10, 2);
    table.jsonb('numberPick');
    table.string('slipType', 10);
    // table.integer('specialValue');
    table.enu('status', ['placed', 'win', 'lose', 'redeem']).defaultTo('placed');

    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('slips');
};
