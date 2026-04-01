[Console]::Out.Flush()
try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:3000/")
    $listener.Start()
    [Console]::WriteLine("Serving on http://localhost:3000")
    [Console]::Out.Flush()
    while ($true) {
        $ctx = $listener.GetContext()
        $file = $ctx.Request.Url.LocalPath
        if ($file -eq "/") { $file = "/index.html" }
        $basePath = "C:\Users\chris\Desktop\Claude Test"
        $path = Join-Path $basePath ($file.TrimStart("/"))
        try {
            if (Test-Path $path) {
                $bytes = [System.IO.File]::ReadAllBytes($path)
                $ext = [System.IO.Path]::GetExtension($path)
                switch ($ext) {
                    ".html" { $ctx.Response.ContentType = "text/html; charset=utf-8" }
                    ".js"   { $ctx.Response.ContentType = "application/javascript" }
                    ".css"  { $ctx.Response.ContentType = "text/css" }
                    ".png"  { $ctx.Response.ContentType = "image/png" }
                    ".jpg"  { $ctx.Response.ContentType = "image/jpeg" }
                    default { $ctx.Response.ContentType = "application/octet-stream" }
                }
                $ctx.Response.ContentLength64 = $bytes.Length
                $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $ctx.Response.StatusCode = 404
            }
        } catch {
            $ctx.Response.StatusCode = 500
        }
        $ctx.Response.Close()
    }
} catch {
    [Console]::Error.WriteLine("Server error: $_")
    [Console]::Error.Flush()
    Start-Sleep -Seconds 9999
}
