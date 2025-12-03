# Railway Troubleshooting

## 502 Error - App Not Starting

### Check 1: Database Connection
The logs showed `Context impl SQLiteImpl` which means PostgreSQL isn't connected.

**Fix:** Make sure DATABASE_URL is set:
1. In Railway dashboard, go to your **PostgreSQL service** ("satisfied-gentleness")
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value
4. Go to your **web service** ("wonderful-serrenity")
5. Go to **"Variables"** tab
6. Add `DATABASE_URL` with the value from PostgreSQL service
7. OR use Railway's "Reference Variable" feature to link them

### Check 2: Port Binding
The app must bind to Railway's PORT environment variable.

**Fixed in:** `railway.json` - start command now uses `${PORT:-5000}`

### Check 3: View Full Logs
```bash
railway logs --tail 100
```

Or in Railway dashboard:
- Go to your web service
- Click "Deployments" tab
- Click on latest deployment
- View logs

### Check 4: Verify Deployment
1. Check Railway dashboard → Deployments
2. Make sure latest deployment shows "Active" or "Running"
3. Check for any error messages in logs

### Common Issues:
- **502 Bad Gateway**: App crashed or not listening on correct port
- **Database connection errors**: DATABASE_URL not set or incorrect
- **Static files 404**: Frontend build not included or wrong path
- **Migration errors**: Database not accessible or migrations failing

