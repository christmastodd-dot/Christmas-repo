$ErrorActionPreference = "Stop"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
[Console]::Out.WriteLine("Serving on http://localhost:8080")
[Console]::Out.Flush()
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $file = $ctx.Request.Url.LocalPath
    if ($file -eq "/") { $file = "/index.html" }
    $basePath = $PSScriptRoot
    $path = Join-Path $basePath ($file.TrimStart("/"))
    if (Test-Path $path) {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $ext = [System.IO.Path]::GetExtension($path)
        switch ($ext) {
            ".html" { $ctx.Response.ContentType = "text/html" }
            ".js"   { $ctx.Response.ContentType = "application/javascript" }
            ".css"  { $ctx.Response.ContentType = "text/css" }
            default { $ctx.Response.ContentType = "application/octet-stream" }
        }
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
