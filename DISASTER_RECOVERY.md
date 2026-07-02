# Disaster Recovery

The daily backup job now creates two recovery layers:

- In-Mongo recovery snapshots, retained for 14 days.
- Offsite S3 disaster-recovery artifacts, when `BACKUP_S3_BUCKET` or `DR_S3_BUCKET` is configured.

## Required Environment

Use a separate bucket from the live attachment bucket:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=live-attachment-bucket
BACKUP_S3_BUCKET=offsite-dr-bucket
BACKUP_S3_PREFIX=disaster-recovery
```

`DR_S3_BUCKET` may be used instead of `BACKUP_S3_BUCKET`.

## What Is Backed Up

Mongo collections:

- `pipelinestates`
- `authusers`
- `binayahdocuments`
- `chatmessages`
- `zoomcallcaches`
- `digestentries`

S3:

- Document attachment objects referenced by `binayahdocuments.attachments[*].key`

## Schedule

Vercel runs `/api/cron/backup` daily at `0 2 * * *`.

Manual trigger:

```bash
curl -H "x-admin-secret: $ADMIN_SECRET" https://dashboard.binayahhub.com/api/cron/backup
```

## Backup Commands

List offsite artifacts:

```bash
npm run dr:list
```

Create a backup immediately:

```bash
npm run dr:backup
```

## Restore Policy

The app stores recoverable backup artifacts only. There is no bundled destructive
restore command. If a restore is needed, ask Codex to restore a specific
`backupId`; restoration should be done deliberately from the stored artifact.

## Notes

- In-Mongo snapshots remain useful for quick dashboard state recovery, but full
  disaster recovery depends on the offsite S3 bucket.
- S3 objects that are not referenced by document metadata are not copied.
