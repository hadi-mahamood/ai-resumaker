# Get local IP Address
$ip = (Get-NetIPAddress | Where-Object { $_.AddressFamily -eq 'IPv4' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "127.0.0.1" }
$port = 8080

# Start TCP Listener on all interfaces (0.0.0.0)
$server = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ResuMake AI Local Network Web Server" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Your friend can access the app at:" -ForegroundColor White
Write-Host "👉 http://$($ip):$port/" -ForegroundColor Yellow
Write-Host "  (Ensure they are on the same Wi-Fi / Local Network)" -ForegroundColor DarkGray
Write-Host "You can access it locally at:" -ForegroundColor White
Write-Host "👉 http://localhost:$port/" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this console to stop the server." -ForegroundColor Red

try {
    $server.Start()
} catch {
    Write-Host "ERROR: Could not start TCP server on port $port." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Exit
}

# Mapping of file extensions to MIME types
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".json" = "application/json"
}

$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = Get-Location }

while ($true) {
    try {
        $client = $server.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $line = $reader.ReadLine()
        if ($null -ne $line) {
            # Extract requested path, e.g. "GET /index.html HTTP/1.1"
            $tokens = $line -split ' '
            if ($tokens.Length -ge 2) {
                $rawPath = $tokens[1]
                if ($rawPath -eq "/") { $rawPath = "/index.html" }
                # Strip query parameters
                $rawPath = ($rawPath -split '\?')[0]
                $filePath = Join-Path $currentDir $rawPath

                if (Test-Path $filePath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $mime = $mimeTypes[$ext]
                    if (-not $mime) { $mime = "application/octet-stream" }

                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    
                    $header = "HTTP/1.1 200 OK`r`n" +
                              "Content-Type: $mime`r`n" +
                              "Content-Length: $($bytes.Length)`r`n" +
                              "Connection: close`r`n`r`n"
                    
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $err = "HTTP/1.1 404 Not Found`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found"
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes($err)
                    $stream.Write($errBytes, 0, $errBytes.Length)
                }
            }
        }
        $stream.Close()
        $client.Close()
    } catch {
        if ($null -ne $client) { $client.Close() }
    }
}
