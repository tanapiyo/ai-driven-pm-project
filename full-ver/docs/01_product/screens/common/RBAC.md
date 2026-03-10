# Role-Based Access Control (RBAC)

Role-based access control specification for screen visibility and actions.

---

## Roles

| Role | Code | Description |
|------|------|-------------|
| Admin | `admin` | Full system access. Can manage users, view audit logs, configure settings. |
| User | `user` | Standard authenticated user. Access to core product features only. |

---

## Screen Access Matrix

| Screen | Admin | User |
|--------|-------|------|
| Home (H01) | Read | Read |
| Profile (P01) | Read/Write (own) | Read/Write (own) |
| Settings (ST01) | Read/Write | Read/Write |
| Login (L01) | — | — |
| Admin: User Management (AD01) | Full | None |
| Admin: Audit Logs (AD04) | Read | None |

---

## Implementation Notes

- Role is stored in the JWT token and re-validated on each request
- UI hides unauthorized navigation items based on role
- Backend enforces role checks independently of frontend (defense in depth)
- Default role for new users is `user`
- There must always be at least one `admin` account in the system
