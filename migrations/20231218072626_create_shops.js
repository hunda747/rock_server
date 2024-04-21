/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// migrations/YYYYMMDDHHMMSS_create_shops.js
exports.up = function (knex) {
  return knex.schema.createTable('shops', (table) => {
    table.increments('id').primary();
    table.integer('shopOwnerId').unsigned().notNullable();
    table.foreign('shopOwnerId').references('shop_owners.id').onDelete('CASCADE');
    table.string('name').unique().notNullable();
    table.string('username').unique().notNullable();
    table.string('password');
    table.string('location').notNullable();
    table.integer('rtp').defaultTo(10);
    table.string('oddType').defaultTo('kiron');
    table.integer('minStake').defaultTo(10);
    table.integer('maxStake').defaultTo(1000);
    table.integer('cashierLimit').defaultTo(10000);
    table.enu('status', ['active', 'inactive', 'pending']).defaultTo('active');


    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('shops');
};

