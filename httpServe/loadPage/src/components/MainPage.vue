<template>
  <div class="main-page">
    <h1>机器人模型加载测试</h1>
    <div class="options">
      <button @click="navigateToTest('all')">测试模型整体</button>
      <div class="individual-test">
        <h3>或单独测试模型:</h3>
        <div class="checkboxes">
          <label v-for="n in 7" :key="n">
            <input type="checkbox" v-model="selectedJoints" :value="n - 1" />
            关节 {{ n }}
          </label>
        </div>
        <button @click="navigateToTest('individual')">开始单独测试</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const selectedJoints = ref([]);

const navigateToTest = (mode) => {
  if (mode === 'individual' && selectedJoints.value.length === 0) {
    alert('请至少选择一个关节进行测试！');
    return;
  }
  
  if (mode === 'individual') {
    // 传递勾选的关节索引作为参数
    router.push({ 
      name: 'TestPage', 
      query: { 
        mode: 'individual', 
        joints: selectedJoints.value.join(',') 
      } 
    });
  } else {
    router.push({ name: 'TestPage', query: { mode: 'all' } });
  }
};
</script>

<style scoped>
.main-page {
  text-align: center;
  padding: 50px;
}
.options {
  margin-top: 30px;
}
button {
  padding: 10px 20px;
  font-size: 16px;
  margin: 10px;
  cursor: pointer;
}
.individual-test {
  margin-top: 30px;
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 8px;
}
.checkboxes label {
  margin: 0 10px;
}
</style>