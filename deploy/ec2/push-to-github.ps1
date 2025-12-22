[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $Message,
  [Parameter()] [string] $Branch = '',
  [Parameter()] [switch] $NoAdd
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Required command not found: git'
}

# Ensure we're in a git repo
try {
  $isRepo = (git rev-parse --is-inside-work-tree 2>$null)
} catch {
  $isRepo = $null
}

if ($isRepo -ne 'true') {
  throw "This folder is not a git repository (missing .git). Open the real cloned repo folder, then run again."
}

if (-not $NoAdd) {
  git add -A
}

# Commit (handles "nothing to commit" cleanly)
try {
  git commit -m $Message
} catch {
  $status = (git status --porcelain)
  if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
  } else {
    throw
  }
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
}

git push origin $Branch

Write-Host "Pushed to origin/$Branch"