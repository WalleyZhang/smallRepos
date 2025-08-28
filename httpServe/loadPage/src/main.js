import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import MainPage from './components/MainPage.vue';
import TestPage from './components/TestPage.vue';

const routes = [
  { path: '/', component: MainPage },
  { path: '/test', name: 'TestPage', component: TestPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');