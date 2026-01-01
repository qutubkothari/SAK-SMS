\pset pager off
\timing on

select "tenantId", "emailAddress", "lastHistoryId", "updatedAt"
from "GmailSyncState"
order by "updatedAt" desc
limit 5;

select "id", "tenantId", "channel", "email", "fullName", "externalId", "createdAt"
from "Lead"
where "channel" = 'EMAIL'
order by "createdAt" desc
limit 10;

select "id", "tenantId", "channel", "direction", "leadId", "createdAt", left("body", 160) as body_preview
from "Message"
where "channel" = 'EMAIL'
order by "createdAt" desc
limit 10;

