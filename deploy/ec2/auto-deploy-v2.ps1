# Auto-deploy watcher: Commits to GitHub and deploys to EC2 on file changes
param(
  [string]$Server = '13.200.36.74',
  [string]$User = 'ubuntu',
  [string]$KeyPath = '',
  [string]$RepoUrl = 'https://github.com/qutubkothari/SAK-SMS.git',
  [string]$Branch = 'main',
  [string]$AppDir = '/opt/sak-ai-enquiry-handler',
  [int]$DebounceSeconds = 5
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Resolve-Path "$PSScriptRoot\..\.."

Write-Host "Auto-deploy watcher started" -ForegroundColor Cyan
Write-Host "Workspace: $workspaceRoot"
Write-Host "Watching for changes... (Ctrl+C to stop)`n"

# Verify commands
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git not found' }
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) { throw 'ssh not found' }
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) { throw 'scp not found' }

# Verify git repo
Push-Location $workspaceRoot
try { $isRepo = (git rev-parse --is-inside-work-tree 2>$null) } catch { $isRepo = $null }
Pop-Location
if ($isRepo -ne 'true') { throw 'Not a git repository' }

# Setup watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $workspaceRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName,DirectoryName,LastWrite'

$lastTrigger = [DateTime]::MinValue
$timer = New-Object System.Timers.Timer
$timer.Interval = $DebounceSeconds * 1000
$timer.AutoReset = $false

$deployAction = {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "`n[$ts] Starting auto-deploy..." -ForegroundColor Yellow
  
  Push-Location $workspaceRoot
  $branch = if ($Branch) { $Branch } else { (git rev-parse --abbrev-ref HEAD).Trim() }
  
  try {
    Write-Host "  [1/2] Committing to GitHub..." -ForegroundColor Cyan
    git add -A
    $stat = (git status --porcelain)
    if ($stat) {
      git commit -m "Auto-deploy: $ts"
      git push origin $branch
      Write-Host "  OK Pushed to origin/$branch" -ForegroundColor Green
    } else {
      Write-Host "  OK No changes" -ForegroundColor Green
    }
    
    Write-Host "  [2/2] Deploying to EC2..." -ForegroundColor Cyan
    $sshOpts = @('-o', 'StrictHostKeyChecking=accept-new')
    if ($KeyPath) {
      if (-not (Test-Path $KeyPath)) { throw "Key not found: $KeyPath" }
      $sshOpts += @('-i', $KeyPath)
    }
    $tgt = "$User@$Server"
    
    & ssh @sshOpts $tgt "mkdir -p $AppDir/deploy/ec2" | Out-Null
    & scp @sshOpts -q deploy/ec2/remote-deploy.sh deploy/ec2/pm2.config.cjs deploy/ec2/nginx-site.conf deploy/ec2/bootstrap.sh "${tgt}:$AppDir/deploy/ec2/" | Out-Null
    
    $cmd = "chmod +x $AppDir/deploy/ec2/remote-deploy.sh && APP_DIR=$AppDir BRANCH=$branch REPO_URL=$RepoUrl $AppDir/deploy/ec2/remote-deploy.sh"
    & ssh @sshOpts $tgt $cmd | Out-Host
    
    Write-Host "  OK EC2 deploy complete" -ForegroundColor Green
    Write-Host "  Web:  http://$Server/" -ForegroundColor Cyan
    Write-Host "  API:  http://$Server/api/health" -ForegroundColor Cyan
  } catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
  } finally {
    Pop-Location
  }
  
  Write-Host "`nWatching for changes... (Ctrl+C to stop)" -ForegroundColor Gray
}

Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action $deployAction | Out-Null

$changeHandler = {
  param($s, $e)
  $p = $e.FullPath
  if ($p -match '(node_modules|\.git|dist|\.logs|\.next|\.vscode|\.turbo)') { return }
  if ($p -match '\.(log|tmp|temp|swp|lock)$') { return }
  $timer.Stop()
  $timer.Start()
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $changeHandler | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $changeHandler | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $changeHandler | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $changeHandler | Out-Null

try {
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  $watcher.Dispose()
  $timer.Dispose()
  Write-Host "Auto-deploy watcher stopped" -ForegroundColor Yellow
}
