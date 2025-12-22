[CmdletBinding()]
param(
  [Parameter()] [string] $Server = '13.200.36.74',
  [Parameter()] [string] $User = 'ubuntu',
  [Parameter()] [string] $KeyPath = '',
  [Parameter()] [string] $RepoUrl = 'https://github.com/qutubkothari/SAK-SMS.git',
  [Parameter()] [string] $Branch = 'main',
  [Parameter()] [string] $AppDir = '/opt/sak-ai-enquiry-handler',
  [Parameter()] [int] $DebounceSeconds = 5
)

$ErrorActionPreference = 'Stop'

$workspaceRoot = Resolve-Path "$PSScriptRoot\..\.."

Write-Host "==> Auto-deploy watcher started" -ForegroundColor Cyan
Write-Host "Workspace: $workspaceRoot"
Write-Host "Watching for changes... (Ctrl+C to stop)"
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Required command not found: git'
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw 'Required command not found: ssh. Install OpenSSH client and try again.'
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw 'Required command not found: scp. Install OpenSSH client and try again.'
}

# Verify this is a git repo
Push-Location $workspaceRoot
try {
  $isRepo = (git rev-parse --is-inside-work-tree 2>$null)
} catch {
  $isRepo = $null
}
Pop-Location

if ($isRepo -ne 'true') {
  throw "Workspace is not a git repository. Initialize git first: git init"
}

# File system watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $workspaceRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Filter out noise (node_modules, .git, dist, etc)
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName,DirectoryName,LastWrite'

$lastChange = $null
$debounceTimer = $null

function Invoke-AutoDeploy {
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host ""
  Write-Host "[$timestamp] Change detected, starting auto-deploy..." -ForegroundColor Yellow
  
  Push-Location $workspaceRoot
  
  try {
    # Step 1: Commit and push to GitHub
    Write-Host "  [1/2] Committing to GitHub..." -ForegroundColor Cyan
    
    git add -A
    
    $status = (git status --porcelain)
    if (-not [string]::IsNullOrWhiteSpace($status)) {
      $commitMsg = "Auto-deploy: changes at $timestamp"
      git commit -m $commitMsg
      
      if ([string]::IsNullOrWhiteSpace($Branch)) {
        $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
      } else {
        $currentBranch = $Branch
      }
      
      git push origin $currentBranch
      Write-Host "  ✓ Pushed to origin/$currentBranch" -ForegroundColor Green
    } else {
      Write-Host "  ✓ No changes to commit" -ForegroundColor Green
    }
    
    # Step 2: Deploy to EC2
    Write-Host "  [2/2] Deploying to EC2..." -ForegroundColor Cyan
    
    $sshArgs = @(
      '-o', 'StrictHostKeyChecking=accept-new'
    )
    
    if (-not [string]::IsNullOrWhiteSpace($KeyPath)) {
      if (-not (Test-Path -LiteralPath $KeyPath)) {
        throw "KeyPath does not exist: $KeyPath"
      }
      $sshArgs += @('-i', $KeyPath)
    }
    
    $target = "$User@$Server"
    
    # Upload deploy scripts
    & ssh @sshArgs $target "mkdir -p $AppDir/deploy/ec2" | Out-Null
    & scp @sshArgs -q "deploy/ec2/remote-deploy.sh" "deploy/ec2/pm2.config.cjs" "deploy/ec2/nginx-site.conf" "deploy/ec2/bootstrap.sh" "${target}:$AppDir/deploy/ec2/" | Out-Null
    
    # Execute remote deploy
    $remoteCmd = @(
      "chmod +x $AppDir/deploy/ec2/remote-deploy.sh",
      "APP_DIR=$AppDir BRANCH=$currentBranch REPO_URL=$RepoUrl $AppDir/deploy/ec2/remote-deploy.sh"
    ) -join ' && '
    
    & ssh @sshArgs $target $remoteCmd | Out-Host
    
    Write-Host "  ✓ EC2 deploy complete" -ForegroundColor Green
    Write-Host "  Web:  http://$Server/" -ForegroundColor Cyan
    Write-Host "  API:  http://$Server/api/health" -ForegroundColor Cyan
    
  } catch {
    Write-Host "  ✗ Deploy failed: $_" -ForegroundColor Red
  } finally {
    Pop-Location
  }
  
  Write-Host ""
  Write-Host "Watching for changes... (Ctrl+C to stop)" -ForegroundColor Gray
}

$onChange = {
  param($sender, $e)
  
  # Filter out noise
  $path = $e.FullPath
  if ($path -match '(node_modules|\.git|dist|\.logs|\.next|\.vscode|\.turbo)\\') {
    return
  }
  
  if ($path -match '\.(log|tmp|temp|swp|lock)$') {
    return
  }
  
  # Debounce: wait for changes to settle
  $script:lastChange = Get-Date
  
  if ($null -eq $script:debounceTimer) {
    $script:debounceTimer = New-Object System.Timers.Timer
    $script:debounceTimer.Interval = $DebounceSeconds * 1000
    $script:debounceTimer.AutoReset = $false
    
    Register-ObjectEvent -InputObject $script:debounceTimer -EventName Elapsed -Action {
      Invoke-AutoDeploy
    } | Out-Null
  }
  
  $script:debounceTimer.Stop()
  $script:debounceTimer.Start()
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $onChange | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $onChange | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $onChange | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $onChange | Out-Null

# Keep script running
try {
  while ($true) {
    Start-Sleep -Seconds 1
  }
} finally {
  $watcher.Dispose()
  if ($null -ne $debounceTimer) {
    $debounceTimer.Dispose()
  }
  Write-Host "Auto-deploy watcher stopped." -ForegroundColor Yellow
}
