# Admin Requirements

Generic admin panel functional requirements.

---

## FR-A1 Role-Based Access Control (RBAC)

### Overview

Implement role-based access control to restrict system functions by user role.

### Roles

| Role | Description |
|------|-------------|
| Admin | Full access to all features, user management, audit logs |
| User | Access to standard features only |

### Requirements

- Users must be assigned a role at creation time
- Role changes are logged in the audit trail
- UI adapts based on the current user's role (hide/show menu items)

---

## FR-A2 User Management

### Overview

Admin users can manage all system users.

### Requirements

- List all users with role and status
- Create new users with email and role assignment
- Edit user name, email, role
- Deactivate (soft-delete) users
- Cannot deactivate the last admin account

---

## FR-A3 Audit Logging

### Overview

All significant system actions are recorded for compliance and debugging.

### Logged Events

- User login / logout
- User account create, update, deactivate
- Role change
- Password change

### Requirements

- Logs are read-only (no deletion)
- Logs include: timestamp, actor user ID, action, target resource, IP address
- Admin can filter logs by date range, actor, action type
