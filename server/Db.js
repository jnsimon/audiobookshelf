const fs = require('fs-extra')
const Path = require('path')
const njodb = require("njodb")
const jwt = require('jsonwebtoken')
const Logger = require('./Logger')
const Audiobook = require('./Audiobook')
const User = require('./User')

class Db {
  constructor(CONFIG_PATH) {
    this.ConfigPath = CONFIG_PATH
    this.AudiobooksPath = Path.join(CONFIG_PATH, 'audiobooks')
    this.UsersPath = Path.join(CONFIG_PATH, 'users')
    this.SettingsPath = Path.join(CONFIG_PATH, 'settings')

    this.audiobooksDb = new njodb.Database(this.AudiobooksPath)
    this.usersDb = new njodb.Database(this.UsersPath)
    this.settingsDb = new njodb.Database(this.SettingsPath, { datastores: 2 })

    this.users = []
    this.audiobooks = []
    this.settings = []
  }

  getEntityDb(entityName) {
    if (entityName === 'user') return this.usersDb
    else if (entityName === 'audiobook') return this.audiobooksDb
    return this.settingsDb
  }

  getEntityArrayKey(entityName) {
    if (entityName === 'user') return 'users'
    else if (entityName === 'audiobook') return 'audiobooks'
    return 'settings'
  }

  getDefaultSettings() {
    return {
      config: {
        version: 1,
        cardSize: 'md'
      }
    }
  }

  getDefaultUser(token) {
    return new User({
      id: 'root',
      type: 'root',

      username: 'root',
      pash: '',
      stream: null,
      token,
      createdAt: Date.now()
    })
  }

  async init() {
    await this.load()

    // Insert Defaults
    if (!this.users.find(u => u.type === 'root')) {
      var token = await jwt.sign({ userId: 'root' }, process.env.TOKEN_SECRET)
      Logger.debug('Generated default token', token)
      await this.insertUser(this.getDefaultUser(token))
    }
  }

  async load() {
    var p1 = this.audiobooksDb.select(() => true).then((results) => {
      this.audiobooks = results.data.map(a => new Audiobook(a))
      Logger.info(`Audiobooks Loaded ${this.audiobooks.length}`)
    })
    var p2 = this.usersDb.select(() => true).then((results) => {
      this.users = results.data.map(u => new User(u))
      Logger.info(`Users Loaded ${this.users.length}`)
    })
    var p3 = this.settingsDb.select(() => true).then((results) => {
      this.settings = results
    })
    await Promise.all([p1, p2, p3])
  }

  insertAudiobook(audiobook) {
    return this.insertAudiobooks([audiobook])
  }

  insertAudiobooks(audiobooks) {
    return this.audiobooksDb.insert(audiobooks).then((results) => {
      Logger.debug(`[DB] Inserted ${results.inserted} audiobooks`)
      this.audiobooks = this.audiobooks.concat(audiobooks)
    }).catch((error) => {
      Logger.error(`[DB] Insert audiobooks Failed ${error}`)
    })
  }

  updateAudiobook(audiobook) {
    return this.audiobooksDb.update((record) => record.id === audiobook.id, () => audiobook).then((results) => {
      Logger.debug(`[DB] Audiobook updated ${results.updated}`)
    }).catch((error) => {
      Logger.error(`[DB] Audiobook update failed ${error}`)
    })
  }

  insertUser(user) {
    return this.usersDb.insert([user]).then((results) => {
      Logger.debug(`[DB] Inserted user ${results.inserted}`)
      this.users.push(user)
    }).catch((error) => {
      Logger.error(`[DB] Insert user Failed ${error}`)
    })
  }

  updateUserStream(userId, streamId) {
    return this.usersDb.update((record) => record.id === userId, (user) => {
      user.stream = streamId
      return user
    }).then((results) => {
      Logger.debug(`[DB] Updated user ${results.updated}`)
      this.users = this.users.map(u => {
        if (u.id === userId) {
          u.stream = streamId
        }
        return u
      })
    }).catch((error) => {
      Logger.error(`[DB] Update user Failed ${error}`)
    })
  }

  updateEntity(entityName, entity) {
    var entityDb = this.getEntityDb(entityName)
    return entityDb.update((record) => record.id === entity.id, () => entity).then((results) => {
      Logger.debug(`[DB] Updated entity ${entityName}: ${results.updated}`)
      var arrayKey = this.getEntityArrayKey(entityName)
      this[arrayKey] = this[arrayKey].map(e => {
        return e.id === entity.id ? entity : e
      })
    }).catch((error) => {
      Logger.error(`[DB] Update entity ${entityName} Failed: ${error}`)
    })
  }

  removeEntity(entityName, entityId) {
    var entityDb = this.getEntityDb(entityName)
    return entityDb.delete((record) => record.id === entityId).then((results) => {
      Logger.debug(`[DB] Deleted entity ${entityName}: ${results.deleted}`)
      var arrayKey = this.getEntityArrayKey(entityName)
      this[arrayKey] = this[arrayKey].filter(e => {
        return e.id !== entityId
      })
    }).catch((error) => {
      Logger.error(`[DB] Remove entity ${entityName} Failed: ${error}`)
    })
  }

  getGenres() {
    var allGenres = []
    this.db.audiobooks.forEach((audiobook) => {
      allGenres = allGenres.concat(audiobook.genres)
    })
    allGenres = [...new Set(allGenres)] // Removes duplicates
    return allGenres
  }

  getTags() {
    var allTags = []
    this.db.audiobooks.forEach((audiobook) => {
      allTags = allTags.concat(audiobook.tags)
    })
    allTags = [...new Set(allTags)] // Removes duplicates
    return allTags
  }
}
module.exports = Db