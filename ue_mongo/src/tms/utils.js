import { Message } from 'element-ui'
import { v5 as uuidv5 } from 'uuid'

export default class Utils {
  constructor() {}
  /**
   * 生成随机数
   */
  static getRandom(numbers = 32) {
    const timestamp = new Date().getTime()
    const namespace = '1b671a64-40d5-491e-99b0-da01ff1f3341'
    const md = uuidv5(timestamp.toString(), namespace)
    let result = md.replace(/-/g, '').substr(0, numbers)
    return result
  }
  /**
   * 生成订单编号
   */
  static generateOrderId(schema, doc) {
    if (!schema.properties.source && !schema.properties.order_id)
      return { msg: 'success', data: doc }
    if (doc.source && doc.source === '3') {
      doc['order_id'] = Utils.getRandom()
      return { msg: 'success', data: doc }
    }
  }
  /**
   * 定义审核状态
   */
  static defineAuditStatus(schema, doc) {
    if (!schema.properties.auditing_status) return { msg: 'success', data: doc }
    doc.auditing_status = '3'
    return { msg: 'success', data: doc }
  }
  /**
   * 价格校验
   */
  static priceValidate(schema, key, val) {
    if (isNaN(Number(val))) {
      Message.error({
        message: schema[key].title + '应填入正确的数字',
        customClass: 'mzindex'
      })
      return false
    }
    if (Number(val) < 0) {
      Message.error({
        message: schema[key].title + '的值不能小于0',
        customClass: 'mzindex'
      })
      return false
    }
    const value = val.split('.')
    if (value.length > 2) {
      Message.error({
        message: schema[key].title + '格式错误',
        customClass: 'mzindex'
      })
      return false
    }
    if (value.length !== 1) {
      const float = value[1]
      if (float.length > 3) {
        Message.error({
          message: this.schema[key].title + '格式错误,小数点后不能大于3位',
          customClass: 'mzindex'
        })
        return false
      }
    }
    return true
  }
  /**
   * 价格格式化
   */
  static priceFormat(value) {
    if (value === '') return value
    let val = String(Number(value))
    let arrOfVal = val.split('.')
    if (arrOfVal.length === 1) {
      val = val + '.00'
    } else {
      let floatVal = arrOfVal[1].split('')
      if (floatVal.length === 1) {
        val = val + '0'
      } else if (floatVal.length === 3 && floatVal[2] === '0') {
        val = val.substr(0, val.length - 1)
      }
    }
    return val
  }
  /**
   * 价格字段补零
   */
  static fillingZero(schema, doc) {
    if (!process.env.VUE_APP_FILLINGZERO_FIELD)
      return { msg: 'success', data: doc }
    const config = process.env.VUE_APP_FILLINGZERO_FIELD

    let validate = Object.entries(doc)
      .map(([key, value]) => {
        if (config.indexOf(key) === -1) return true

        const flag = Utils.priceValidate(schema.properties, key, value)
        if (flag) doc[key] = Utils.priceFormat(value)

        return flag
      })
      .every(ele => ele === true)

    let result = validate
      ? { msg: 'success', data: doc }
      : { msg: 'fail', data: null }
    return result
  }
}
