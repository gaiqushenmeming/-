# 简易 HTTP 服务器，用于本地测试网页游戏
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "服务器已启动: http://localhost:8000/"
Write-Host "按 Ctrl+C 停止"

$root = (Get-Location).Path

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $url = $request.Url.LocalPath
    if ($url -eq "/") { $url = "/index.html" }
    $filePath = Join-Path $root $url.TrimStart("/")

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = switch ($ext) {
            ".html" { "text/html; charset=utf-8" }
            ".css"  { "text/css; charset=utf-8" }
            ".js"   { "application/javascript; charset=utf-8" }
            ".json" { "application/json" }
            ".png"  { "image/png" }
            ".jpg"  { "image/jpeg" }
            default { "application/octet-stream" }
        }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $mime
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $url")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}
