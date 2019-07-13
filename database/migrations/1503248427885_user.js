'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserSchema extends Schema {
  up () {
    this.create('users', (table) => {
      table.increments()
      table.string('email', 254).notNullable().unique()
      table.string('password', 1).nullable()
      table.string('device_unique_id', 191).notNullable()
      table.string('name', 255).nullable()
      table.string('email', 60).notNullable()
      table.string('user_number', 60).nullable()
      table.string('device_type', 255).notNullable()
      table.string('device_name', 255).nullable()
      table.string('region_code', 4).nullable()
      table.string('language_code', 4).notNullable()
      table.string('country_code', 4).nullable()
      table.string('original', 255).nullable()
      table.string('thumbnail', 255).nullable()
      table.boolean('is_verify', 2).default(0)
      table.boolean('is_premium', 2).default(0)
      table.boolean('status', 2).default(1)
      table.timestamps()
    })
  }

  down () {
    this.drop('users')
  }
}

module.exports = UserSchema
