# Jenkins Pipeline Scheduling Quick Reference

**Last Updated**: 2025-01-13

---

## Quick Start

### Schedule Daily Builds

1. Open Jenkins job: `quizmaker-pipeline`
2. Click **Configure**
3. Scroll to **Build Triggers**
4. Check **Build periodically**
5. Enter cron expression: `H 2 * * *` (daily at 2 AM)
6. Click **Save**

---

## Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

---

## Common Schedules

### Daily Builds

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every day at 2 AM | `H 2 * * *` | Recommended for nightly builds |
| Every day at midnight | `H 0 * * *` | Start of day |
| Every day at 9 AM | `H 9 * * *` | Morning build |

### Hourly Builds

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every hour | `H * * * *` | Hourly builds |
| Every 6 hours | `H */6 * * *` | Four times daily |
| Every 12 hours | `H */12 * * *` | Twice daily |

### Weekly Builds

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every Monday at 9 AM | `H 9 * * 1` | Start of week |
| Every Sunday at midnight | `H 0 * * 0` | End of week |
| Every weekday at 2 AM | `H 2 * * 1-5` | Monday-Friday |

### Monthly Builds

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| First day of month at 2 AM | `H 2 1 * *` | Monthly build |
| Last day of month at 2 AM | `H 2 28-31 * *` | End of month |

---

## Using the "H" Symbol

The `H` symbol tells Jenkins to **hash** the schedule to avoid all jobs running at the same time.

**Examples**:
- `H 2 * * *` - Runs at 2 AM, but Jenkins distributes the exact minute across agents
- `H */6 * * *` - Runs every 6 hours, distributed across the hour
- `H H * * 1-5` - Runs once per day on weekdays, distributed across the day

---

## Recommended Schedules

### For Development Team

**Daily Nightly Build**:
```
H 2 * * *
```
- Runs all unit tests
- Builds application
- Generates reports
- **Parameters**: `ENVIRONMENT=dev`, `DEPLOY_TO_CLOUDFLARE=false`

**Pre-Deployment Build**:
```
H 8 * * 1-5
```
- Runs on weekdays at 8 AM
- Full test suite
- **Parameters**: `ENVIRONMENT=stage`, `RUN_INTEGRATION_TESTS=true`, `DEPLOY_TO_CLOUDFLARE=true`

### For Production

**Production Deployment**:
```
H 10 * * 1
```
- Runs every Monday at 10 AM
- Full test suite
- Deploys to production
- **Parameters**: `ENVIRONMENT=prod`, `RUN_INTEGRATION_TESTS=true`, `DEPLOY_TO_CLOUDFLARE=true`

---

## Multiple Schedules

You can configure multiple schedules by adding multiple cron expressions, one per line:

```
H 2 * * *
H 14 * * *
```

This runs the job at 2 AM and 2 PM daily.

---

## Testing Schedules

To test your schedule without waiting:

1. **Use Online Cron Validator**:
   - https://crontab.guru/
   - Enter your cron expression
   - Verify it matches your intent

2. **Test in Jenkins**:
   - Configure schedule
   - Click "Save"
   - Wait for next scheduled run
   - Or trigger manually: "Build Now"

---

## Examples for QuizMaker

### Example 1: Nightly Test Run

**Goal**: Run tests every night without deploying

**Schedule**: `H 2 * * *`

**Parameters**:
- `ENVIRONMENT`: `dev`
- `RUN_INTEGRATION_TESTS`: `false`
- `DEPLOY_TO_CLOUDFLARE`: `false`
- `SKIP_UNIT_TESTS`: `false`

### Example 2: Weekly Deployment

**Goal**: Deploy to staging every Monday morning

**Schedule**: `H 9 * * 1`

**Parameters**:
- `ENVIRONMENT`: `stage`
- `RUN_INTEGRATION_TESTS`: `true`
- `DEPLOY_TO_CLOUDFLARE`: `true`
- `SKIP_UNIT_TESTS`: `false`

### Example 3: Hourly Smoke Tests

**Goal**: Quick validation every hour

**Schedule**: `H * * * *`

**Parameters**:
- `ENVIRONMENT`: `dev`
- `RUN_INTEGRATION_TESTS`: `false`
- `DEPLOY_TO_CLOUDFLARE`: `false`
- `SKIP_UNIT_TESTS`: `false`

---

## Timezone Considerations

Jenkins uses the **server's timezone** for cron schedules.

**To check Jenkins timezone**:
1. Manage Jenkins → System Information
2. Look for `user.timezone` property

**To change timezone**:
1. Set `JAVA_OPTS` environment variable:
   ```bash
   JAVA_OPTS=-Duser.timezone=America/New_York
   ```
2. Restart Jenkins

---

## Best Practices

1. **Use "H" for Distribution**: Prevents all jobs from running simultaneously
2. **Avoid Peak Hours**: Schedule builds during off-peak hours (2-4 AM)
3. **Test First**: Test schedules with manual builds before relying on automation
4. **Document Schedules**: Keep a record of why schedules are set
5. **Monitor Execution**: Check build history to ensure schedules are working

---

## Troubleshooting

### Schedule Not Running

1. **Check Jenkins Logs**:
   - Manage Jenkins → System Log
   - Look for cron-related errors

2. **Verify Cron Syntax**:
   - Use https://crontab.guru/ to validate
   - Check for typos or invalid expressions

3. **Check Jenkins Service**:
   - Ensure Jenkins is running
   - Check system time is correct

### Builds Running at Wrong Time

1. **Check Timezone**: Verify Jenkins server timezone
2. **Check System Time**: Ensure server clock is synchronized
3. **Review Schedule**: Double-check cron expression

---

## References

- **Jenkins Cron Syntax**: https://www.jenkins.io/doc/book/pipeline/syntax/#cron-syntax
- **Cron Expression Validator**: https://crontab.guru/
- **Jenkins Setup Guide**: `docs/JENKINS_SETUP.md`

---

**End of Scheduling Quick Reference**
