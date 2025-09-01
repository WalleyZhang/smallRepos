<template>
  <div class="test-page">
    <div class="controls">
      <label>
        测试次数:
        <input type="number" v-model.number="testCount" min="1" />
      </label>
      <label>
        超时时间 (ms):
        <input type="number" v-model.number="timeout" min="100" />
      </label>
      <button @click="startTest" :disabled="isTesting">
        {{ isTesting ? '测试中...' : '开始测试' }}
      </button>
    </div>

    <div class="canvas-container">
      <canvas ref="canvas"></canvas>
    </div>

    <div v-if="isTesting" class="progress-bar-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      <p>当前加载进度: {{ progress }}%</p>
    </div>

    <div v-if="testResults" class="results">
      <h3>测试结果</h3>
      <div v-html="formattedResults"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'; 
import { useRouter, useRoute } from 'vue-router';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  GridHelper,
  AmbientLight,
  DirectionalLight,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RobotLoader } from '../utils/RobotLoader';

// ----------------------------------------------------------------------------------
// Three.js 场景设置
// ----------------------------------------------------------------------------------
const canvas = ref(null);
let scene, camera, renderer, controls;
const robotLoader = new RobotLoader();

const initThree = () => {
  scene = new Scene();
  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 100, 100000);
  renderer = new WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight * 0.7);
  renderer.setClearColor(0xffffff, 1);

  // 添加网格线
  const gridHelper = new GridHelper(20000, 100);
  scene.add(gridHelper);

  // 添加灯光
  scene.add(new AmbientLight(0x404040, 2));
  const directionalLight = new DirectionalLight(0xffffff, 3);
  directionalLight.position.set(100, 100, 100);
  scene.add(directionalLight);

  // 摄像机位置
  camera.position.set(5000, 5000, 5000);
  camera.lookAt(0, 0, 0);

  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 添加机器人模型到场景中
  scene.add(robotLoader);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  window.addEventListener('resize', onResize);
};

const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight * 0.7;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

onMounted(() => {
  initThree();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  renderer.dispose();
  controls.dispose();
  scene.clear();
});

// ----------------------------------------------------------------------------------
// 测试逻辑
// ----------------------------------------------------------------------------------
const route = useRoute();
const router = useRouter();

const testMode = route.query.mode;
const selectedJoints = testMode === 'individual' ? route.query.joints.split(',').map(Number) : [];

const testCount = ref(10);
const timeout = ref(3000);
const isTesting = ref(false);
const testResults = ref(null);
const progress = ref(0);
let intervalId;

const totalTests = computed(() => {
    // 整体测试只会加载一次模型
    return testMode === 'all' ? testCount.value : testCount.value * selectedJoints.length;
});

let currentTest = 0;
const resultsData = {
  successCount: 0,
  failCount: 0,
  failedModels: {}
};

const startTest = async () => {
  if (isTesting.value) return;

  isTesting.value = true;
  testResults.value = null;
  currentTest = 0;
  Object.assign(resultsData, { successCount: 0, failCount: 0, failedModels: {} });

  // 启动进度条更新
  intervalId = setInterval(() => {
    if (robotLoader.status === 'loading') {
      progress.value = robotLoader.progressPercentage;
    } else {
      progress.value = 100;
    }
  }, 100);
  
  const startTime = performance.now();
  for (let i = 0; i < testCount.value; i++) {
    await runSingleTest();
    await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms
  }
  const endTime = performance.now();

  clearInterval(intervalId);
  isTesting.value = false;
  
  // 汇总结果并生成文档
  testResults.value = {
    totalTime: endTime - startTime - (testCount.value - 1) * 100,
    successCount: resultsData.successCount,
    failCount: resultsData.failCount,
    failedModels: resultsData.failedModels
  };
  generateMarkdownReport();
};

const runSingleTest = async () => {
  try {
    // 每次测试前清空旧模型
    robotLoader.clear(); 
    // 根据模式加载模型
    if (testMode === 'all') {
      await robotLoader.load(timeout.value);
    } else {
      await robotLoader.loadIndividualJoints(selectedJoints);
    }
    
    // 如果加载成功
    if (robotLoader.status === 'loaded') {
      resultsData.successCount++;
    } else {
      throw new Error(robotLoader.failReason || '加载失败');
    }

  } catch (error) {
    resultsData.failCount++;
    const failedModelNames = testMode === 'all' 
      ? ['整体模型'] 
      : selectedJoints.map(index => `关节${index + 1}`);
    
    failedModelNames.forEach(name => {
      resultsData.failedModels[name] = (resultsData.failedModels[name] || 0) + 1;
    });
    console.error('加载失败:', error);
  } finally {
    currentTest++;
    // 更新进度条
    progress.value = (currentTest / totalTests.value) * 100;
  }
};

const generateMarkdownReport = () => {
  const { totalTime, successCount, failCount, failedModels } = testResults.value;
  let markdown = `### 模型加载测试报告\n\n`;
  markdown += `测试模式: ${testMode === 'all' ? '整体模型' : '单独模型'}\n`;
  markdown += `测试次数: ${testCount.value}\n`;
  markdown += `总用时: ${totalTime.toFixed(2)}ms\n\n`;
  markdown += `平均用时: ${(totalTime / testCount.value).toFixed(2)}ms\n`;

  markdown += `| 状态 | 成功次数 | 失败次数 | 失败率 |\n`;
  markdown += `| :--- | :--- | :--- | :--- |\n`;
  markdown += `| - | ${successCount} | ${failCount} | ${((failCount / (successCount + failCount)) * 100).toFixed(2)}% |\n\n`;
  
  if (Object.keys(failedModels).length > 0) {
    markdown += `##### 失败模型详情\n`;
    markdown += `| 模型名 | 失败次数 |\n`;
    markdown += `| :--- | :--- |\n`;
    for (const [model, count] of Object.entries(failedModels)) {
      markdown += `| ${model} | ${count} |\n`;
    }
  }
  
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '测试报告.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

</script>

<style scoped>
.test-page {
  text-align: center;
  padding: 20px;
}
.controls {
  margin-bottom: 20px;
}
.controls label {
  margin: 0 10px;
}
button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  background-color: #4CAF50;
  color: white;
  border-radius: 4px;
}
button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.canvas-container {
  width: 100%;
  height: 70vh;
  margin-top: 20px;
  border: 1px solid #ccc;
}
canvas {
  display: block;
}
.progress-bar-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-top: 20px;
}
.progress-bar {
  height: 20px;
  background-color: #76c7c0;
  border-radius: 5px;
  transition: width 0.3s ease;
}
.results {
  margin-top: 20px;
  text-align: left;
  white-space: pre-wrap;
}
</style>