/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// migrations/YYYYMMDDHHMMSS_create_shop_owners.js
exports.up = function (knex) {
  return knex.schema.createTable('sub_agents', (table) => {
    table.increments('id').primary();
    table.integer('shopOwnerId').unsigned().notNullable();
    table.foreign('shopOwnerId').references('shop_owners.id').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('username').unique().notNullable();
    table.string('password').notNullable();
    table.boolean('status').defaultTo(true);
  
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sub_agents');
};

