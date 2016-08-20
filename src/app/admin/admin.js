import Vue from 'vue'
import VueRouter from 'vue-router'
import validator from '../../utils/valid'
import { sync } from 'vuex-router-sync'
import store from '../../vuex/store'
import configRouter from '../../router/admin'
import filters from '../../utils/filters'
import App from '../../components/Admin/App.vue'
var vueSmoothScroll = require('vue-smoothscroll');

 

var Bootstrap = require('bootstrap');
Bootstrap.$ = $ 
require('../../global/js/core.min');
import '../../lib/site'


import VueDb from '../../utils/vueDb'
Vue.use(VueDb)

Vue.config.debug = true

Vue.use(VueRouter)
import lazyload from 'vue-lazyload'


Vue.use(lazyload)


Vue.use(vueSmoothScroll);

Vue.use(validator)
//Vue.use(require('vue-moment'));
Object.keys(filters).forEach(k => Vue.filter(k, filters[k]))

const router = new VueRouter({
  history: false,
  saveScrollPosition: true,
  suppressTransitionError: true
})
configRouter(router)
sync(store, router)

// router.beforeEach(function (transition) {
//   window.SmoothScroll.destroy();
//   console.log("asdfas")
//   transition.next();
// })

// router.afterEach(function (transition) {
//   window.SmoothScroll.run();
// })
 
router.start(Vue.extend(App), '#root') 
window.router = router