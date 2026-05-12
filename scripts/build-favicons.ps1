param(
    [string]$Source = "$PSScriptRoot\..\puzzler_logo_teal_1024.png",
    [string]$OutDir = "$PSScriptRoot\.."
)

Add-Type -AssemblyName System.Drawing

function Resize-Png {
    param([System.Drawing.Image]$Src, [int]$Size, [string]$Out)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $bmp.SetResolution(96, 96)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($Src, 0, 0, $Size, $Size)
    $g.Dispose()
    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Build-Ico {
    param([string[]]$PngPaths, [string]$OutIco)
    # ICO format reference: https://en.wikipedia.org/wiki/ICO_(file_format)
    $entries = @()
    foreach ($p in $PngPaths) {
        $bytes = [System.IO.File]::ReadAllBytes($p)
        $img = [System.Drawing.Image]::FromFile($p)
        $entries += [pscustomobject]@{
            Width  = if ($img.Width  -ge 256) { 0 } else { $img.Width  }
            Height = if ($img.Height -ge 256) { 0 } else { $img.Height }
            Bytes  = $bytes
        }
        $img.Dispose()
    }
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter $ms
    # ICONDIR header
    $bw.Write([UInt16]0)         # Reserved
    $bw.Write([UInt16]1)         # Type: 1 = icon
    $bw.Write([UInt16]$entries.Count)
    # ICONDIRENTRY structures
    $dataOffset = 6 + (16 * $entries.Count)
    foreach ($e in $entries) {
        $bw.Write([byte]$e.Width)
        $bw.Write([byte]$e.Height)
        $bw.Write([byte]0)        # palette
        $bw.Write([byte]0)        # reserved
        $bw.Write([UInt16]1)      # color planes
        $bw.Write([UInt16]32)     # bits per pixel
        $bw.Write([UInt32]$e.Bytes.Length)
        $bw.Write([UInt32]$dataOffset)
        $dataOffset += $e.Bytes.Length
    }
    foreach ($e in $entries) {
        $bw.Write($e.Bytes)
    }
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($OutIco, $ms.ToArray())
    $bw.Dispose()
    $ms.Dispose()
}

$src = [System.Drawing.Image]::FromFile($Source)
try {
    $tmp = Join-Path $env:TEMP "favicon-build-$([guid]::NewGuid())"
    New-Item -ItemType Directory -Path $tmp | Out-Null

    $p16 = Join-Path $tmp "16.png"
    $p32 = Join-Path $tmp "32.png"
    $p48 = Join-Path $tmp "48.png"
    Resize-Png $src 16 $p16
    Resize-Png $src 32 $p32
    Resize-Png $src 48 $p48

    Build-Ico @($p16, $p32, $p48) (Join-Path $OutDir "favicon.ico")

    Resize-Png $src 180 (Join-Path $OutDir "apple-touch-icon.png")
    Resize-Png $src 192 (Join-Path $OutDir "icon-192.png")
    Resize-Png $src 512 (Join-Path $OutDir "icon-512.png")

    Remove-Item -Recurse -Force $tmp
    Write-Host "Wrote favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png"
} finally {
    $src.Dispose()
}
