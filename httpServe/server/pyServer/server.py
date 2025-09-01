#! /usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import logging
import tornado.ioloop
import tornado.web

# 静态文件目录
STATIC_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../loadPage/dist")
)
PORT = 10010

# 设置日志
logger = logging.getLogger("tornado")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
ch.setFormatter(formatter)
logger.addHandler(ch)


class MyStaticFileHandler(tornado.web.StaticFileHandler):
    CACHE_MAX_AGE = 0  # 禁用缓存

    def set_extra_headers(self, path):
        # 设置响应头，不缓存
        self.set_header("Cache-Control", "no-cache")
        self.clear_header("ETag")

    def validate_absolute_path(self, root: str, absolute_path: str):
        try:
            return super().validate_absolute_path(root, absolute_path)
        except tornado.web.HTTPError as e:
            # 打印异常请求日志
            logger.exception(f"[{e.status_code}] {absolute_path}")
            if e.status_code != 404:
                raise e from e
            # 如果访问的是 HTML 文件不存在，重定向到 index.html
            if os.path.basename(absolute_path).endswith(".html"):
                return os.path.join(root, "index.html")
            raise e


def make_app():
    return tornado.web.Application(
        [
            # 所有请求都由自定义 StaticFileHandler 处理
            (r"/(.*)", MyStaticFileHandler, {"path": STATIC_DIR, "default_filename": "index.html"}),
        ],
        debug=True,
        compress_response=True,  # 启用 gzip 压缩
    )


if __name__ == "__main__":
    app = make_app()
    app.listen(PORT)
    logger.info(f"SPA server running at http://localhost:{PORT}")
    tornado.ioloop.IOLoop.current().start()
