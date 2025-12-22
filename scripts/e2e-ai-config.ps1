$ErrorActionPreference = 'Stop'

$api = 'http://localhost:4000'

$health = Invoke-RestMethod -Uri "$api/health"
Write-Host "health ok=$($health.ok)"

$emailSuffix = [Guid]::NewGuid().ToString('N').Substring(0, 6)
$bootBody = @{
  tenantName  = 'AI Smoke Tenant'
  email       = "manager+$emailSuffix@demo.local"
  password    = 'password123'
  displayName = 'Manager AI'
} | ConvertTo-Json

$boot = Invoke-RestMethod -Method Post -Uri "$api/dev/bootstrap" -ContentType 'application/json' -Body $bootBody
$tenantId = $boot.tenant.id
$userId = $boot.user.id
$role = $boot.user.role

Write-Host "tenantId=$tenantId userId=$userId role=$role"

$headers = @{
  'x-tenant-id' = $tenantId
  'x-user-id'   = $userId
  'x-role'      = $role
}

$seedBody = @{ tenantId = $tenantId; salesmanCount = 5 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$api/dev/seed" -ContentType 'application/json' -Body $seedBody | Out-Null

$cfg1 = Invoke-RestMethod -Method Get -Uri "$api/ai/config" -Headers $headers
Write-Host "cfg provider=$($cfg1.config.provider) model=$($cfg1.config.openaiModel) hasKey=$($cfg1.config.hasOpenaiApiKey)"

$patchBody = @{ provider = 'OPENAI'; openaiModel = 'gpt-4o-mini' } | ConvertTo-Json
$cfg2 = Invoke-RestMethod -Method Patch -Uri "$api/ai/config" -Headers $headers -ContentType 'application/json' -Body $patchBody
if ($cfg2.warning) { Write-Host "patch warning=$($cfg2.warning)" }

$cfg3 = Invoke-RestMethod -Method Get -Uri "$api/ai/config" -Headers $headers
Write-Host "cfg after provider=$($cfg3.config.provider) model=$($cfg3.config.openaiModel) hasKey=$($cfg3.config.hasOpenaiApiKey)"

$ingestBody = @{
  channel         = 'WHATSAPP'
  fullName        = 'Test Customer'
  phone           = '+971500000999'
  customerMessage = 'Hi, need price and delivery ASAP'
} | ConvertTo-Json

$ing = Invoke-RestMethod -Method Post -Uri "$api/ingest/message" -Headers @{ 'x-tenant-id' = $tenantId } -ContentType 'application/json' -Body $ingestBody
Write-Host "ingest ok leadId=$($ing.leadId) triageReason=$($ing.triage.reason) escal=$($ing.draft.shouldEscalate)"

$lead = Invoke-RestMethod -Method Get -Uri "$api/leads/$($ing.leadId)" -Headers $headers
Write-Host "lead heat=$($lead.lead.heat) lang=$($lead.lead.language) messages=$($lead.lead.messages.Count)"
