const ModelColl = require('../models/mgdb/collection')

/**
 * 控制器辅助类
 */
class Helper {
  constructor(ctrl) {
    this.ctrl = ctrl
  }
  /**
   * 存储管理对象的结合
   */
  get clMongoObj() {
    const client = this.ctrl.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')

    return cl
  }
  /**
   * 获得请求的数据库
   *
   * @param {boolean} bThrowNotFound - 如果不可访问是否抛出异常
   *
   * @return {object} 数据库
   */
  async findRequestDb(bThrowNotFound = true, dbName = null) {
    if (!dbName) dbName = this.ctrl.request.query.db
    const query = { name: dbName, type: 'database' }
    if (this.ctrl.bucket) query.bucket = this.ctrl.bucket.name

    const db = await this.clMongoObj.findOne(query)

    if (bThrowNotFound && !db) throw Error(`指定的数据库[db=${dbName}]不可访问`)

    return db
  }
  /**
   * 获得请求的集合（管理对象）
   *
   * @param {boolean} bThrowNotFound - 没有找到时抛出异常
   *
   * @returns {object} 集合
   */
  async findRequestCl(bThrowNotFound = true) {
    const { db: dbName, cl: clName } = this.ctrl.request.query
    const modelCl = new ModelColl(this.ctrl.bucket)
    const cl = await modelCl.byName(dbName, clName)

    if (bThrowNotFound && !cl)
      throw Error(`指定的集合[db=${dbName}][cl=${clName}]不可访问`)

    return cl
  }
  /**
   * 获得管理集合对应的系统集合对象
   * @param {boolean} tmwCl
   *
   * @returns {object} Collection - 数据库系统集合对象
   */
  findSysColl(tmwCl) {
    let { mongoClient } = this.ctrl
    let sysCl = mongoClient.db(tmwCl.db.sysname).collection(tmwCl.sysname)

    return sysCl
  }
}

module.exports = Helper
