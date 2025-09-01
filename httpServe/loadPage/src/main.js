import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import MainPage from './components/MainPage.vue';
import TestPage from './components/TestPage.vue';
import AdditionalTestPage from './components/AdditionalTestPage.vue';

const routes = [
  { path: '/', component: MainPage },
  { path: '/test', name: 'TestPage', component: TestPage },
  { path: '/additionalTest', name: 'AdditionalTestPage', component: AdditionalTestPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');