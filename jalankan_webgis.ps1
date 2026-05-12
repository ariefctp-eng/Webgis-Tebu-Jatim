# Simple HTTP Server for WebGIS
$port = 8000
$basePath = Get-Location

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "WebGIS Server started at http://localhost:$port/"
Write-Host "Base Path: $basePath"
Write-Host "Press Ctrl+C to stop.`n"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $url = $request.Url.LocalPath.TrimStart('/')
        if ($url -eq "") { $url = "index.html" }
        
        $filePath = Join-Path $basePath $url

        if (Test-Path $filePath -PathType Leaf) {
            # Use FileStream with Shared Access to prevent "File in Use" errors
            $fileStream = New-Object System.IO.FileStream($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            $content = New-Object byte[] $fileStream.Length
            $fileStream.Read($content, 0, $fileStream.Length) | Out-Null
            $fileStream.Close()
            $fileStream.Dispose()
            
            # Set content type
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript" }
            elseif ($filePath.EndsWith(".shp")) { $response.ContentType = "application/octet-stream" }
            elseif ($filePath.EndsWith(".dbf")) { $response.ContentType = "application/octet-stream" }
            elseif ($filePath.EndsWith(".prj")) { $response.ContentType = "text/plain" }
            elseif ($filePath.EndsWith(".png")) { $response.ContentType = "image/png" }
            elseif ($filePath.EndsWith(".jpg")) { $response.ContentType = "image/jpeg" }
            
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
