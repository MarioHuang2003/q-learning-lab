// 入口：仅负责实例化 App
import { App } from './app.js';

const app = new App();
window.__app = app;
app.start();
