[CmdletBinding()]
param(
  [Parameter()] [string] $Server = $(if ($env:EC2_HOST) { $env:EC2_HOST } else { '13.200.36.74' }),
  [Parameter()] [string] $User = $(if ($env:EC2_USER) { $env:EC2_USER } else { 'ubuntu' }),
  [Parameter()] [string] $AppDir = $(if ($env:EC2_APP_DIR) { $env:EC2_APP_DIR } else { '/opt/sak-ai-enquiry-handler' }),
  [Parameter()] [string] $Branch = $(if ($env:EC2_BRANCH) { $env:EC2_BRANCH } else { 'main' }),
  [Parameter()] [string] $RepoUrl = $(if ($env:EC2_REPO_URL) { $env:EC2_REPO_URL } else { '' }),
  [Parameter()] [string] $KeyPath = $(if ($env:EC2_KEY_PATH) { $env:EC2_KEY_PATH } else { '' })
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw 'Required command not found: ssh. Install OpenSSH client (ssh/scp) and try again.'
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw 'Required command not found: scp. Install OpenSSH client (ssh/scp) and try again.'
}

if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
  Write-Host "NOTE: RepoUrl is empty. If this is the first deploy, you must pass -RepoUrl https://github.com/<owner>/<repo>.git" -ForegroundColor Yellow
}

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

Write-Host "==> Ensuring remote deploy dir: $AppDir/deploy/ec2"
& ssh @sshArgs $target "mkdir -p $AppDir/deploy/ec2" | Out-Host

Write-Host "==> Uploading deploy scripts"
# Always upload the latest deploy helpers (even if repo checkout is older).
& scp @sshArgs "deploy/ec2/remote-deploy.sh" "deploy/ec2/pm2.config.cjs" "deploy/ec2/nginx-site.conf" "deploy/ec2/bootstrap.sh" "${target}:$AppDir/deploy/ec2/" | Out-Host

Write-Host "==> Running remote deploy (pulls from GitHub and restarts services)"
$remoteCmd = @(
  "chmod +x $AppDir/deploy/ec2/remote-deploy.sh",
  "APP_DIR=$AppDir BRANCH=$Branch REPO_URL=$RepoUrl $AppDir/deploy/ec2/remote-deploy.sh"
) -join ' && '

& ssh @sshArgs $target $remoteCmd | Out-Host

Write-Host "==> Done"
Write-Host "Web:  http://$Server/"
Write-Host "API:  http://$Server/api/health"