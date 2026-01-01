[CmdletBinding()]
param(
  [Parameter()] [string] $Server = $(if ($env:EC2_HOST) { $env:EC2_HOST } else { '13.200.36.74' }),
  [Parameter()] [string] $User = $(if ($env:EC2_USER) { $env:EC2_USER } else { 'ubuntu' }),
  [Parameter()] [string] $AppDir = $(if ($env:EC2_APP_DIR) { $env:EC2_APP_DIR } else { '/opt/sak-ai-enquiry-handler' }),
  [Parameter()] [string] $Branch = $(if ($env:EC2_BRANCH) { $env:EC2_BRANCH } else { 'main' }),
  [Parameter()] [string] $RepoUrl = $(if ($env:EC2_REPO_URL) { $env:EC2_REPO_URL } else { '' }),
  [Parameter()] [string] $KeyPath = $(if ($env:EC2_KEY_PATH) { $env:EC2_KEY_PATH } else { '' }),

  # Optional: shared-server safe Nginx publish/config settings
  [Parameter()] [string] $WebRoot = $(if ($env:WEB_ROOT) { $env:WEB_ROOT } else { '' }),
  [Parameter()] [string] $NginxSiteName = $(if ($env:NGINX_SITE_NAME) { $env:NGINX_SITE_NAME } else { '' }),
  [Parameter()] [string] $NginxSiteConf = $(if ($env:NGINX_SITE_CONF) { $env:NGINX_SITE_CONF } else { '' }),
  [Parameter()] [string] $RemoveDefaultSite = $(if ($env:REMOVE_DEFAULT_SITE) { $env:REMOVE_DEFAULT_SITE } else { '' })
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
& ssh @sshArgs $target "sudo mkdir -p $AppDir/deploy/ec2 && sudo chown -R ${User}:${User} $AppDir" | Out-Host
if ($LASTEXITCODE -ne 0) { throw "ssh failed (mkdir). Exit code: $LASTEXITCODE" }

Write-Host "==> Uploading deploy scripts"
# Always upload the latest deploy helpers (even if repo checkout is older).
& scp @sshArgs "deploy/ec2/remote-deploy.sh" "deploy/ec2/pm2.config.cjs" "deploy/ec2/nginx-site.conf" "deploy/ec2/bootstrap.sh" "${target}:$AppDir/deploy/ec2/" | Out-Host
if ($LASTEXITCODE -ne 0) { throw "scp failed (upload deploy scripts). Exit code: $LASTEXITCODE" }

Write-Host "==> Running remote deploy (pulls from GitHub and restarts services)"
$remoteEnv = @(
  "APP_DIR=$AppDir",
  "BRANCH=$Branch",
  "REPO_URL=$RepoUrl"
)
if (-not [string]::IsNullOrWhiteSpace($WebRoot)) { $remoteEnv += "WEB_ROOT=$WebRoot" }
if (-not [string]::IsNullOrWhiteSpace($NginxSiteName)) { $remoteEnv += "NGINX_SITE_NAME=$NginxSiteName" }
if (-not [string]::IsNullOrWhiteSpace($NginxSiteConf)) { $remoteEnv += "NGINX_SITE_CONF=$NginxSiteConf" }
if (-not [string]::IsNullOrWhiteSpace($RemoveDefaultSite)) { $remoteEnv += "REMOVE_DEFAULT_SITE=$RemoveDefaultSite" }


$remoteCmdInner = @(
  "chmod +x $AppDir/deploy/ec2/remote-deploy.sh",
  "env " + ($remoteEnv -join ' ') + " $AppDir/deploy/ec2/remote-deploy.sh"
) -join ' && '

# Execute via bash so env assignments + chaining behave consistently.
$remoteCmd = "bash -lc '$remoteCmdInner'"

& ssh @sshArgs $target $remoteCmd | Out-Host
if ($LASTEXITCODE -ne 0) { throw "ssh failed (remote deploy). Exit code: $LASTEXITCODE" }

Write-Host "==> Done"
Write-Host "Web:  http://$Server/"
Write-Host "API:  http://$Server/api/health"