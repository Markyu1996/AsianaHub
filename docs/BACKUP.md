# Asiana Hub — Backup Guide

## Why Backup?

The database is a single file at `/data/advance.db` on Render's persistent disk.
While Render's disk is reliable, **manual backups protect against accidental data loss,
corruption, or account issues.**

---

## Backup Methods

### Method 1: Manual Download via Render Shell (Recommended)

1. Go to your Render dashboard
2. Click on your `asiana-hub` service
3. Click the **Shell** tab (top right)
4. Run the following command to create a safe backup copy:

```bash
sqlite3 /data/advance.db ".backup /data/advance_backup_$(date +%Y%m%d_%H%M%S).db"
```

5. To download the file, use the Render API or set up cloud sync (see Method 3)

---

### Method 2: API-Based Backup Script

Create a script on your local machine. First, get your Render API key from
**Render Dashboard → Account Settings → API Keys**.

Save this as `backup.sh` on your computer:

```bash
#!/bin/bash
# backup.sh — Run this weekly to back up the database

RENDER_API_KEY="your-render-api-key"
SERVICE_ID="your-service-id"   # Found in Render dashboard URL
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Trigger a database backup via shell command
curl -s -X POST \
  "https://api.render.com/v1/services/${SERVICE_ID}/shell" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"command\": \"sqlite3 /data/advance.db .dump > /data/dump_${DATE}.sql\"}"

echo "✅ Backup triggered: dump_${DATE}.sql"
```

---

### Method 3: Automatic Backup to Google Drive or S3 (Advanced)

Add this environment variable to your Render service:

```
BACKUP_CRON=true
```

Then add a backup route to your app (optional enhancement for future).

---

## Restoring from Backup

### Restore from a `.db` file

1. Open the Render Shell
2. Stop write activity (warn users the system is in maintenance)
3. Run:

```bash
# Replace backup file name with yours
cp /data/advance.db /data/advance_pre_restore.db   # Safety copy
cp /data/advance_backup_20240615_120000.db /data/advance.db
echo "Restore complete"
```

4. Restart the service from the Render dashboard

### Restore from a `.sql` dump

```bash
sqlite3 /data/advance_restored.db < /data/dump_20240615_120000.sql
cp /data/advance.db /data/advance_pre_restore.db
cp /data/advance_restored.db /data/advance.db
```

---

## Backup Schedule Recommendation

| Frequency | Method | Retention |
|---|---|---|
| Daily | Manual shell backup | Keep 7 days |
| Weekly | Download to local machine | Keep 4 weeks |
| Monthly | Archive to cloud storage | Keep 12 months |

---

## Checking Database Size

```bash
# In Render Shell
du -sh /data/advance.db
```

For a system with 10 users and typical usage, the database will stay under **5 MB** for years.

---

## Verifying a Backup

```bash
# In Render Shell — check the backup is valid
sqlite3 /data/advance_backup_YYYYMMDD.db "SELECT COUNT(*) FROM User;"
sqlite3 /data/advance_backup_YYYYMMDD.db "SELECT COUNT(*) FROM AdvanceRequest;"
```

If these return numbers without error, the backup is valid.
