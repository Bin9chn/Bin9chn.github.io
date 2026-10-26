param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $true)]
  [string]$Url,

  [Parameter(Mandatory = $true)]
  [string]$Description,

  [string]$Avatar = "",

  [string[]]$Tags = @()
)

$root = Split-Path $PSScriptRoot -Parent
$dataPath = Join-Path $root "data/friends.json"
$data = Get-Content -Raw -LiteralPath $dataPath | ConvertFrom-Json
$friends = @($data.friends)

if ($friends | Where-Object { $_.url -eq $Url }) {
  throw "Friend already exists: $Url"
}

$entry = [ordered]@{
  name = $Name
  url = $Url
  description = $Description
  avatar = $Avatar
  tags = @($Tags)
}

$data.friends = @($friends + [pscustomobject]$entry)
$data | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $dataPath -Encoding utf8

Write-Host "Added friend: $Name"
Write-Host "Run 'hugo server' to preview or push the change to publish."
