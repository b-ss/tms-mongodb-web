const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/collection'

export default function create(tmsAxios) {
  return {
    byName(bucket, dbName, clName) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .get(`${base}/byName`, { params })
        .then(rst => rst.data.result)
    },
    /**
     *
     * @param {*} dbName
     */
    list(bucket, dbName, { keyword, page, size } = {}) {
      const params = { bucket, db: dbName, keyword, page, size }
      return tmsAxios
        .get(`${base}/list`, { params })
        .then(rst => rst.data.result)
    },
    create(bucket, dbName, proto) {
      const params = { bucket, db: dbName }
      return tmsAxios
        .post(`${base}/create`, proto, { params })
        .then(rst => rst.data.result)
    },
    update(bucket, dbName, clName, proto) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .post(`${base}/update`, proto, { params })
        .then(rst => rst.data.result)
    },
    remove(bucket, dbName, clName) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .get(`${base}/remove`, { params })
        .then(rst => rst.data.result)
    }
  }
}
