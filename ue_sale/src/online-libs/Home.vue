<template>
  <div>
    <div id="home"></div>
  </div>
</template>

<script>
import Vue from 'vue'

export default {
  name: 'home',
  props: {
    bucketName: String,
    dbName: String,
    clName: String,
    tmsAxiosName: String
  },
  methods: {
    lookTel() {
      window.open(process.env.VUE_APP_WORKLAYER_ADDRESS)
      // const response = {
      //   code: 0,
      //   result: { cust_id: doc.cust_id, order_id: doc.order_id }
      // }
      // this.$emit('success', response)
    }
  },
  mounted() {
    import('../../../ue_comp/src/List.vue').then(Module => {
      Module.createAndMount(
        Vue,
        {
          bucketName: this.bucketName,
          dbName: this.dbName,
          clName: this.clName,
          tmsAxiosName: this.tmsAxiosName,
          lookEvent: this.lookTel
        },
        'home'
      )
    })
  }
}
</script>
