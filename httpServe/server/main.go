package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
)

const staticDir = "../loadPage/dist"
const port = ":10010"

func main() {
	// 1. 创建静态文件处理器
	fs := http.FileServer(http.Dir(staticDir))

	// 2. 创建一个处理器，用于处理 SPA 的路由回退
	//    任何不匹配静态文件的请求都会被导向 index.html
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// 检查请求的路径是否以 /assets/ 开头，以区分静态资源和 SPA 路由
		if r.URL.Path == "/" || r.URL.Path[1:] == "index.html" {
			// 如果是根目录或明确请求 index.html，直接提供该文件
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}

		// 如果请求的路径是一个静态文件（例如 /assets/main.js），则由 fs 处理器处理
		// 否则，它会被重定向到 index.html
		// 为了简单起见，我们直接检查文件是否存在
		fullPath := filepath.Join(staticDir, r.URL.Path)
		if _, err := os.Stat(fullPath); err == nil {
			fs.ServeHTTP(w, r)
			return
		}

		// 对于所有其他未找到的路径（例如 /test），回退到 index.html
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})

	log.Printf("Starting SPA server on http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
