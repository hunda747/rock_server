/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// migrations/YYYYMMDDHHMMSS_create_cashiers.js
exports.up = function (knex) {
  return knex.schema.createTable('cashiers', (table) => {
    table.increments('id').primary();
    table.integer('shopId').unsigned().notNullable();
    table.foreign('shopId').references('shops.id').onDelete('CASCADE');
    table.string('fname').notNullable();
    table.string('lname').notNullable();
    table.string('username').unique().notNullable();
    table.string('password').notNullable();

    table.timestamps(true, true);
  });
};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
*/
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cashiers');
};
