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
    table.string('name').notNullable();
    table.string('location').notNullable();
    table.decimal('minStake').defaultTo(0);
    table.decimal('maxStake').defaultTo(0);
    table.integer('cashierLimit').defaultTo(1);
    // Use ENUM for the status field
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

