/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// migrations/YYYYMMDDHHMMSS_create_shop_owners.js
exports.up = function (knex) {
  return knex.schema.createTable('sub_agent_shops', (table) => {
    table.increments('id').primary();
    table.integer('subAgentId').unsigned();
    table.foreign('subAgentId').references('sub_agents.id').onDelete('CASCADE');
    table.integer('shopId').unsigned();
    table.foreign('shopId').references('shops.id').onDelete('CASCADE');
    table.timestamps(true, true);
  });
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sub_agent_shops');
};

