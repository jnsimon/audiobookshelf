const { DataTypes, Model } = require('sequelize')
const Logger = require('../Logger')
const LibraryItem = require('./LibraryItem')
const Book = require('./Book')
const Database = require('../Database')

class UserMediaRating extends Model {
  constructor(values, options) {
    super(values, options)

    /** @type {UUIDV4} */
    this.id
    /** @type {UUIDV4} */
    this.libraryItemId
    /** @type {number} */
    this.rating
    /** @type {Object} */
    this.extraData
    /** @type {UUIDV4} */
    this.userId
    /** @type {Date} */
    this.updatedAt
    /** @type {Date} */
    this.createdAt
  }

  static removeById(mediaRatingId) {
    return this.destroy({
      where: {
        id: mediaRatingId
      }
    })
  }

  static findUserRating(userId, libraryItemId) {
    return this.findOne({
      where: {
        userId: userId,
        libraryItemId,
      }
    });
  }

  static async createUpdateUserMediaRating(userId, libraryItemId, updatePayload) {
    const itemRating = await this.findUserRating(userId, libraryItemId);

    return this.upsert({
      id: itemRating?.id || undefined,
      userId: userId,
      libraryItemId: libraryItemId,
      rating: updatePayload.rating
    })
  }

  /**
   * Initialize model
   * 
   * Polymorphic association: Book has many MediaRating. PodcastEpisode has many MediaRating.
   * @see https://sequelize.org/docs/v6/advanced-association-concepts/polymorphic-associations/
   * 
   * @param {import('../Database').sequelize} sequelize 
   */
  static init(sequelize) {
    super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      libraryItemId: DataTypes.UUIDV4,
      rating: DataTypes.FLOAT,
      extraData: DataTypes.JSON
    }, {
      sequelize,
      modelName: 'userMediaRating',
      indexes: [
        {
          fields: ['updatedAt'],
          fields: ['libraryItemId'],
        }
      ]
    })

    const { libraryItem, user } = sequelize.models

    libraryItem.hasMany(UserMediaRating, {
      foreignKey: {
        allowNull: false
      },
      constraints: false,
    })
    UserMediaRating.belongsTo(libraryItem, {
      foreignKey: {
        allowNull: false
      },
      constraints: false
    })

    // MediaRating.addHook('afterFind', findResult => {
    //   if (!findResult) return

    //   if (!Array.isArray(findResult)) findResult = [findResult]

    //   for (const instance of findResult) {
    //     if (instance.mediaItemType === 'book' && instance.book !== undefined) {
    //       instance.mediaItem = instance.book
    //       instance.dataValues.mediaItem = instance.dataValues.book
    //     } else if (instance.mediaItemType === 'podcastEpisode' && instance.podcastEpisode !== undefined) {
    //       instance.mediaItem = instance.podcastEpisode
    //       instance.dataValues.mediaItem = instance.dataValues.podcastEpisode
    //     }
    //   }
    // })

    user.hasMany(UserMediaRating, {
      onDelete: 'CASCADE'
    })
    UserMediaRating.belongsTo(user)
  }
}

module.exports = UserMediaRating