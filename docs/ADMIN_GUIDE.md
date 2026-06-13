# Asiana Hub — Administrator Guide

## Admin Role Overview

As an Administrator you have full access to every feature in the system:
- Approve or reject user registrations and assign roles
- Create, edit, deactivate, and delete user accounts
- Manage the student list
- View, action, and delete any advance request at any status
- View soft-deleted requests for audit purposes

---

## Logging In for the First Time

1. Visit your Asiana Hub URL
2. Log in with the default admin account:
   - **Email:** `admin@asianahub.com`
   - **Password:** `Admin@1234!`
3. You will be immediately redirected to change your password
4. Set a strong password (min 8 characters, one uppercase, one number)

⚠️ **Do this before sharing the URL with any staff.**

---

## Managing User Registrations

Staff register themselves on the login page. Their accounts are held in **Pending** status until you approve them.

### To approve a registration:
1. Go to **Admin → Registrations** in the left menu
2. You will see a list of pending accounts with their name, email, and registration date
3. Select the appropriate **role** from the dropdown next to each user:
   - **Requester** — can submit advance requests
   - **Approver** — can review and action requests
   - **Administrator** — full access (use sparingly)
4. Click **Approve** — the user receives an email notification
5. Or click **Reject** to permanently remove the registration

---

## Managing Users

Go to **Admin → Users** to see all active user accounts.

### Create a user manually:
1. Click **Add User**
2. Fill in name, email, role, and a temporary password
3. The user will be prompted to change their password on first login

### Edit a user:
1. Click **Edit** next to any user
2. Change their name, email, role, or status
3. To temporarily disable someone's access: set **Status** to **Deactivated**

### Reset a user's password:
1. Click **Edit** → switch to the **Reset Password** tab
2. Enter a new temporary password
3. The user must change it on next login

### Delete a user:
1. Click **Delete** next to the user
2. Confirm the action — this is permanent

> **Note:** You cannot delete or deactivate your own account.

### Unlocking a locked account:
If a user is locked (too many failed login attempts), open their **Edit** screen and save — this clears the lock. Or reset their password, which also clears the lock.

---

## Managing Students

Go to **Admin → Students** to manage the student reference list.

### Add a student manually:
1. Click **Add Student**
2. Enter the Student ID and full name
3. Click **Add Student** — the student is now searchable by requesters

### Import students from CSV:
1. Click **Import CSV**
2. Download the **sample template** to see the correct format
3. Fill in your student data: one row per student, columns `student_id, name`
4. Upload the completed CSV file
5. Review the import results — existing students are skipped, not duplicated

### Edit a student:
1. Click **Edit** next to any student
2. You can update the name or toggle their **Active** status
3. Inactive students do not appear in requesters' search results

### Deactivating vs Deleting:
- **Deactivate** — student is hidden from new requests but historical data is preserved
- **Delete** — permanently removes the student. Will fail if they have active requests.

---

## Managing Advance Requests

As admin you can see **all requests** including deleted ones.

### View all requests:
Go to **Advance Requests** in the left menu. Use the filters to find specific requests.

### To see deleted requests:
Set the **Status** filter to **Deleted**.

### Delete any request:
1. Open the request detail page
2. Click **Delete Request** (available at any status for admins)
3. Optionally add a comment explaining why
4. The request is soft-deleted — it remains in the database for audit purposes

### Actions available per status:
| Status | Admin can |
|---|---|
| Pending | Approve, Delete |
| Completed | Delete |
| Deleted | View only |

---

## Bank Transfer Reference

On any active request detail page, a **Bank Transfer Reference** box appears for approvers and admins.

Click **Copy reference** to copy the formatted text:
```
DDMMYYYY STUDENTNAME MONYR ADVANCEN RMXXX
```

Example: `10062026 AHMAD BIN ALI JUN26 ADVANCE3 RM150`

Paste this into the **reference** field when making the bank transfer.

---

## Security Best Practices

1. **Never share your admin password** — each admin should have their own account
2. **Use a strong password** — min 12 characters recommended for admin accounts
3. **Deactivate accounts promptly** when staff leave the organisation
4. **Review registrations quickly** — pending accounts cannot log in but take up space
5. **Check audit logs** if anything seems unusual (contact your developer to query the database)

---

## Getting Help

If you encounter issues:
1. Check the **DEPLOYMENT.md** troubleshooting section
2. Check Render logs for server-side errors
3. Contact your system developer with a description of the issue and any error messages
