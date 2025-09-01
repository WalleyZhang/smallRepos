<template>
  <div class="additional-test-page">
    <!-- 顶部设置区域 -->
    <div class="controls">
      <label>
        测试次数：
        <input type="number" v-model.number="testCount" min="1" />
      </label>
      <label>
        超时时间(ms)：
        <input type="number" v-model.number="timeout" min="100" />
      </label>
      <button @click="startTest" :disabled="isTesting">开始测试</button>
    </div>

    <!-- 中间进度条 -->
    <div class="progress-container" v-if="isTesting">
      <div class="progress-bar">
        <div class="progress" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <p>进度：{{ currentTest }}/{{ testCount }}</p>
    </div>

    <!-- 测试结果 -->
    <div class="results" v-if="!isTesting && finished">
      <h3>测试结果</h3>
      <p>成功率：{{ successRate }}%</p>
      <p v-if="successTimes.length > 0">
        平均下载时间：{{ averageTime.toFixed(2) }} ms
      </p>
      <p>超时失败次数：{{ timeoutFailures }}</p>
      <div v-if="otherFailures.length > 0">
        <h4>其它失败原因：</h4>
        <ul>
          <li v-for="(fail, index) in otherFailures" :key="index">
            {{ fail }}
          </li>
        </ul>
      </div>

      <!-- 显示下载到的图片 -->
      <div v-if="imageUrl" class="image-preview">
        <h4>下载的图片：</h4>
        <img :src="imageUrl" alt="Test BMP" />
      </div>

      <button @click="exportMarkdown">导出为 Markdown</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "AdditionalTestPage",
  data() {
    return {
      testCount: 10,
      timeout: 3000,
      isTesting: false,
      currentTest: 0,
      successTimes: [],
      timeoutFailures: 0,
      otherFailures: [],
      finished: false,
      imageUrl: null, // 保存最后一次成功下载的图片
    };
  },
  computed: {
    progressPercent() {
      return this.testCount > 0
        ? Math.round((this.currentTest / this.testCount) * 100)
        : 0;
    },
    successRate() {
      return ((this.successTimes.length / this.testCount) * 100).toFixed(2);
    },
    averageTime() {
      if (this.successTimes.length === 0) return 0;
      const total = this.successTimes.reduce((a, b) => a + b, 0);
      return total / this.successTimes.length;
    },
  },
  methods: {
    async startTest() {
      this.isTesting = true;
      this.finished = false;
      this.currentTest = 0;
      this.successTimes = [];
      this.timeoutFailures = 0;
      this.otherFailures = [];
      this.imageUrl = null;

      for (let i = 0; i < this.testCount; i++) {
        this.currentTest = i + 1;
        try {
          const { time, blob } = await this.downloadWithTimeout(
            "test.bmp",
            this.timeout
          );
          this.successTimes.push(time);

          // 保存最后一次成功的图片
          this.imageUrl = URL.createObjectURL(blob);
        } catch (err) {
          if (err.message === "timeout") {
            this.timeoutFailures++;
          } else {
            this.otherFailures.push(err.message || "未知错误");
          }
        }
      }

      this.isTesting = false;
      this.finished = true;
    },

    downloadWithTimeout(url, timeout) {

      return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const signal = controller.signal;
        const start = performance.now();

        const timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error("timeout"));
        }, timeout);

        fetch(url, { signal, cache: "no-store" })
          .then((response) => {
            if (!response.ok) {
              throw new Error("HTTP错误：" + response.status);
            }
            return response.blob();
          })
          .then((blob) => {
            clearTimeout(timeoutId);
            const end = performance.now();
            resolve({ time: end - start, blob });
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            if (err.name === "AbortError") {
              reject(new Error("timeout"));
            } else {
              reject(err);
            }
          });
      });
    },

    exportMarkdown() {
      let md = `# 下载测试报告\n\n`;
      md += `- 测试次数：${this.testCount}\n`;
      md += `- 超时时间：${this.timeout} ms\n`;
      md += `- 成功率：${this.successRate}%\n`;
      if (this.successTimes.length > 0) {
        md += `- 平均下载时间：${this.averageTime.toFixed(2)} ms\n`;
      }
      md += `- 超时失败次数：${this.timeoutFailures}\n`;

      if (this.otherFailures.length > 0) {
        md += `\n## 其它失败原因\n`;
        this.otherFailures.forEach((fail, i) => {
          md += `- ${i + 1}. ${fail}\n`;
        });
      }

      // 生成 Blob 并下载
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `download_test_report_${Date.now()}.md`;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.additional-test-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

.progress-container {
  margin: 20px 0;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #eee;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress {
  height: 100%;
  background: #42b983;
  transition: width 0.3s;
}

.results {
  margin-top: 30px;
  background: #fafafa;
  padding: 15px;
  border-radius: 5px;
  text-align: center;
}

.image-preview {
  margin: 20px 0;
}

.image-preview img {
  max-width: 100%;
  max-height: 400px;
  border: 1px solid #ddd;
  border-radius: 5px;
}
</style>
