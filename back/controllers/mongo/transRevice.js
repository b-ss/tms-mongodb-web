const { ResultData, ResultFault } = require('tms-koa')
const _ = require('lodash')
const DocBase = require('../documentBase')
const DocModel = require('../../models/mgdb/document')
const ColModel = require('../../models/mgdb/collection')
const syncToPool = require('../../plugins/fnSyncPool')
const syncToWork = require('../../plugins/fnSyncWork')
const log4js = require('log4js')
const { ObjectId } = require('mongodb')
const logger = log4js.getLogger('tms-mongoorder-transrevice')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class TransRevice extends DocBase {
  constructor(...args) {
    super(...args)
  }
  static tmsAuthTrustedHosts() {
    return true
  }
  async revice(dbName, clName, callback) {
    const dbQuery = { name: dbName, type: 'database' }
    const database = await this.docHelper.clMongoObj.findOne(dbQuery)
    if (!database) {
      let logMsg = '指定的数据库不可访问'
      logger.debug(logMsg)
      return (new ResultFault(logMsg))
    }

    const clQuery = { name: clName, type: 'collection', database: database.name }
    const collection = await this.docHelper.clMongoObj.findOne(clQuery)
    if (!collection) {
      let logMsg = '指定的集合不可访问'
      logger.info(logMsg)
      return (new ResultFault(logMsg))
    }

    const currentSchema = await ColModel.getSchemaByCollection(database, clName)
    if (!currentSchema) {
      let logMsg = '指定的集合未指定集合列'
      logger.info(logMsg)
      return (new ResultFault(logMsg))
    }
    return callback(database, clName, currentSchema)
  }
  /**
   *
   *
   * @returns 
   * @memberof TransRevice
   */
  async crm() {
    //所有的字段
    let param = this.request.body
    if (!param.bizID) return new ResultFault('订单编号不存在')
    let doc = {
      source: '1',
      unsubscribe_number: "",
      streamingNo: param.streamingNo,
      SIID: param.SIID,
      order_id: param.bizID,
      cust_id: param.custID,
      customer_id: param.custID,
      cust_name: param.custName,
      manager_name: param.managerName,
      account: param.managerAccount,
      cust_account: param.custAccount,
      manager_tel: param.managerTel,
      num_sum: param.numSum,
      product_version: param.productVersion,
      biz_function: param.bizFunction && param.bizFunction.split(','),
      num_type: param.numType && param.numType.split(',')
    }
    switch (param.productID) {
      case '35831086':
        doc.pro_type = '1'
        doc.flag_playtips = 'Y'
        break;
      case '35831087':
        doc.pro_type = '2'
        break;
      case '35831088':
        doc.pro_type = '3'
        if (param.bizFunction === '1' || param.bizFunction === '1,2') {
          doc.flag_playtips = 'N'
        }
        break;
    }
    // area 还未处理
    let oPerate = (database, clName, schema) => {
      if (param.OPFlag === '0101') {
        return this.purchase(database, clName, schema, doc)
      } else if (param.OPFlag === '0102') {
        return this.update(database, clName, doc)
      } else if (param.OPFlag === '0103') {
        return this.unpurchase(database, clName, doc)
      } else {
        return new ResultFault('暂不处理此类操作类型')
      }
    }
    //return this.revice('official_order_info', 'official_order_info', oPerate)
    return this.revice('testSync', 'testToPoolAndWork', oPerate)
  }
  /**
   *
   * 订购
   * @param {*} database 数据库
   * @param {*} clName 表
   * @param {*} doc 接收的数据
   * @returns
   * @memberof TransRevice
   */
  async purchase(database, clName, schema, doc) {
    Object.assign(doc, { 'status': '1', 'unsubscribe_number': '' })
    // 补默认值
    Object.entries(schema).forEach(([key, value]) => {
      if (value.default) doc[key] = value.default
    })
    // 加工数据
    this._beforeProcessByInAndUp(doc, 'insert')

    return this.mongoClient
      .db(database.sysname)
      .collection(clName)
      .insertOne(doc)
      .then(async result => {
        let modelD = new DocModel()
        await modelD.dataActionLog(result.ops, '订购', database.name, clName)
        return new ResultData({}, '订单订购成功')
      })
  }
  /**
   *
   * 变更
   * @param {*} database 数据库
   * @param {*} clName 表
   * @param {*} doc 接收的数据
   * @returns
   * @memberof TransRevice
   */
  async update(database, clName, doc) {
    let cl, oldDoc, newDoc

    cl = this.mongoClient.db(database.sysname).collection(clName)
    oldDoc = await cl.findOne({ 'order_id': doc.order_id })
    newDoc = {}
    logger.debug('update前原数据', oldDoc)

    Object.assign(newDoc, oldDoc, doc)
    newDoc = _.omit(newDoc, ['order_id'])

    // 加工数据
    this._beforeProcessByInAndUp(newDoc, 'update')
    // 日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let modelD = new DocModel()
      await modelD.dataActionLog(newDoc, '变更', database.name, clName, '', '', JSON.stringify(oldDoc))
    }

    logger.debug('update传递的数据', newDoc)
    return cl.updateOne({ 'order_id': oldDoc.order_id }, { $set: newDoc }).then(() => new ResultData({}, '订单变更成功'))
  }
  /**
   *
   * 退订
   * @param {*} database 数据库
   * @param {*} clName 表
   * @param {*} doc 接收的数据
   * @returns
   * @memberof TransRevice
   */
  async unpurchase(database, clName, doc) {
    let cl, oldDoc, newDoc
    cl = this.mongoClient.db(database.sysname).collection(clName)
    oldDoc = cl.findOne({ 'order_id': doc.order_id })

    if (oldDoc.status === '99') {
      return new ResultFault('该订单已是退订状态')
    }
    if (oldDoc.unsubscribe_number === 'N' || !oldDoc.unsubscribe_number) {
      return new ResultFault('订单下仍有号码，订单退订失败')
    }
    logger.debug('退订前原数据', oldDoc)

    newDoc = { status: '99' }
    Object.assign(newDoc, oldDoc, doc)
    newDoc = _.omit(newDoc, ['order_id'])

    // 加工数据
    this._beforeProcessByInAndUp(newDoc, 'update')
    // 日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let modelD = new DocModel()
      await modelD.dataActionLog(newDoc, '退订', database.name, clName, '', '', JSON.stringify(oldDoc))
    }

    logger.debug('退订传递的数据', newDoc)
    return cl.updateOne({ 'order_id': oldDoc.order_id }, { $set: newDoc }).then(() => new ResultData({}, '订单退订成功'))
  }
  async sync(newDoc, schema, cl, database, clName) {
    if (!newDoc.pool_sync_time) newDoc.pool_sync_status = ""
    if (!newDoc.work_sync_time) newDoc.work_sync_status = ""

    let orders = await cl.find({ '_id': new ObjectId(newDoc._id) }).toArray()
    syncToPool(JSON.parse(JSON.stringify(orders)), schema, cl, { dl: database.name, cl: clName, operate_type: '按选中' })
    syncToWork(JSON.parse(JSON.stringify(orders)), schema, cl, { db: database.name, cl: clName, operate_type: '按选中' })
  }
}

module.exports = TransRevice
