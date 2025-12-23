param(
  [string]$HostIp = "13.200.246.122",
  [string]$User = "ubuntu",
  [string]$KeyPath = "./sak-whatsapp-communicator.pem",
  [string]$RemoteDir = "~/whatsapp-communicator",
  [string]$AppName = "whatsapp-communicator"
)

$ErrorActionPreference = "Stop"

function Assert-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found: $name"
  }
}

Assert-Command "ssh"
Assert-Command "scp"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
Push-Location $repoRoot

try {
  $tmpTar = Join-Path $env:TEMP "whatsapp-communicator-$(Get-Date -Format yyyyMMdd-HHmmss).tgz"

  # Create tarball excluding local artifacts and secrets
  # Windows ships bsdtar behind tar.exe in many environments; tar is usually available.
  Assert-Command "tar"
  tar -czf $tmpTar --exclude="node_modules" --exclude="dist" --exclude=".env" --exclude="prisma/dev.db" --exclude="prisma/prisma/dev.db" .

  $remoteTar = "~/whatsapp-communicator.tgz"

  Write-Host "Uploading package to $User@$HostIp ..."
  scp -i $KeyPath $tmpTar "${User}@${HostIp}:$remoteTar"

  Write-Host "Deploying on EC2 ..."
  $remoteCmd = @(
    "set -e",
    "mkdir -p $RemoteDir",
    "if [ -f $RemoteDir/.env ]; then cp $RemoteDir/.env /tmp/whatsapp-communicator.env; fi",
    "if [ -f $RemoteDir/prisma/prisma/dev.db ]; then mkdir -p /tmp/whatsapp-communicator-prisma/prisma/prisma && cp $RemoteDir/prisma/prisma/dev.db /tmp/whatsapp-communicator-prisma/prisma/prisma/dev.db; fi",
    "if [ -f $RemoteDir/prisma/dev.db ]; then mkdir -p /tmp/whatsapp-communicator-prisma/prisma && cp $RemoteDir/prisma/dev.db /tmp/whatsapp-communicator-prisma/prisma/dev.db; fi",
    "rm -rf $RemoteDir/*",
    "tar -xzf $remoteTar -C $RemoteDir",
    "if [ -f /tmp/whatsapp-communicator.env ]; then cp /tmp/whatsapp-communicator.env $RemoteDir/.env; fi",
    "if [ -f /tmp/whatsapp-communicator-prisma/prisma/prisma/dev.db ]; then mkdir -p $RemoteDir/prisma/prisma && cp /tmp/whatsapp-communicator-prisma/prisma/prisma/dev.db $RemoteDir/prisma/prisma/dev.db; fi",
    "if [ -f /tmp/whatsapp-communicator-prisma/prisma/dev.db ]; then mkdir -p $RemoteDir/prisma && cp /tmp/whatsapp-communicator-prisma/prisma/dev.db $RemoteDir/prisma/dev.db; fi",
    "cd $RemoteDir",
    "npm i",
    "npm run prisma:generate",
    "npm run db:push",
    "npm run build",
    "pm2 delete $AppName 2>/dev/null || true",
    "pm2 start dist/index.js --name $AppName",
    "pm2 save"
  ) -join "; "

  ssh -i $KeyPath "${User}@${HostIp}" $remoteCmd

  Write-Host "Done. Public health check: http://$HostIp/health"
} finally {
  Pop-Location
}
