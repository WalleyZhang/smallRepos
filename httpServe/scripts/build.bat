@echo off
setlocal

rem 设置编码为 UTF-8，以正确显示中文
chcp 65001 > nul

echo.
echo 请选择编译目标操作系统：
echo [1] Linux
echo [2] Windows
echo.
set /p "choice=请输入你的选择 (1 或 2): "

set "GO_OS_CHOICE="
if "%choice%"=="1" (
    set "GO_OS_CHOICE=linux"
) else if "%choice%"=="2" (
    set "GO_OS_CHOICE=windows"
) else (
    echo 无效的选择，使用默认值：Windows
    set "GO_OS_CHOICE=windows"
)

echo.
echo 你选择了编译目标平台：%GO_OS_CHOICE%
echo.

rem 定义路径和文件名
set "OUT_DIR=..\out"
set "GO_SOURCE_PATH=..\server\main.go"
set "GO_BINARY_NAME=server_app"
set "VUE_BUILD_PATH=..\loadPage"
set "FRONTEND_DIST_PATH=..\loadPage\dist"

rem 1. 检查并清理输出目录
if exist "%OUT_DIR%" (
    echo 清理旧的 "%OUT_DIR%" 目录...
    rmdir /s /q "%OUT_DIR%"
)
echo 创建新的 "%OUT_DIR%" 目录...
mkdir "%OUT_DIR%"

rem 2. 编译 Vue 前端项目
echo.
echo 开始编译 Vue 前端项目...
cd "%VUE_BUILD_PATH%"
if %errorlevel% neq 0 (
    echo ❌ 无法进入 Vue 项目目录。
    goto :end
)

call pnpm install
call pnpm run build
if %errorlevel% neq 0 (
    echo ❌ Vue 前端编译失败，请检查错误。
    goto :end
)
echo ✅ Vue 前端编译成功。
cd ..\scripts

rem 将编译后的前端文件移动到输出目录
echo.
echo 移动前端文件到 "%OUT_DIR%"...
mkdir "%OUT_DIR%\loadPage"
xcopy "%FRONTEND_DIST_PATH%" "%OUT_DIR%\loadPage\dist\" /s /e /y
echo ✅ 前端文件移动完成。

rem 3. 编译 Go 后端项目
echo.
echo 开始编译 Go 后端项目...
mkdir "%OUT_DIR%\server"

if "%GO_OS_CHOICE%"=="windows" (
    go build -o "%OUT_DIR%\server\%GO_BINARY_NAME%.exe" "%GO_SOURCE_PATH%"
) else (
    set "GOOS=%GO_OS_CHOICE%"
    set "GOARCH=amd64"
    go build -o "%OUT_DIR%\server\%GO_BINARY_NAME%" "%GO_SOURCE_PATH%"
)

if %errorlevel% neq 0 (
    echo ❌ Go 后端编译失败，请检查错误。
    goto :end
)
echo ✅ Go 后端编译成功。

rem 4. 创建执行脚本
echo.
echo 创建执行脚本...

rem 根据平台预先设置脚本路径
if "%GO_OS_CHOICE%"=="windows" (
    set "EXEC_SCRIPT_PATH=%OUT_DIR%\run.bat"
) else (
    set "EXEC_SCRIPT_PATH=%OUT_DIR%\run.sh"
)

rem 确保目标目录存在
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

if "%GO_OS_CHOICE%"=="windows" (
    (
        echo @echo off
        echo rem 启动服务器
        echo cd server
        echo start %GO_BINARY_NAME%.exe
    ) > "%EXEC_SCRIPT_PATH%"
) else (
    (
        echo #!/bin/bash
        echo echo "正在启动服务器..."
        echo cd server
        echo ./%GO_BINARY_NAME%
    ) > "%EXEC_SCRIPT_PATH%"
)

echo.
echo ✅ 编译和部署完成！所有文件位于 "%OUT_DIR%" 目录中。
echo.
echo -------------------------------------------------------------
echo.
echo 运行方法:
echo 1. 打开命令提示符/终端
echo 2. 进入 "%OUT_DIR%" 目录
echo 3. 运行 "run.bat" (或 "run.sh")
echo.

:end
pause
