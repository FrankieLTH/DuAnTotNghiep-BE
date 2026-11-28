# Project database exports

These files were exported from the local MySQL `duanmoi` database on 2026-11-18.

- `duanmoi_schema.sql` contains the structure for all project tables.
- `duanmoi_reference_seed.sql` contains reference/catalog data used by the project.
- `update_vung_tau_locations.sql` updates an existing local database from the old Hanoi demo branches to the Vũng Tàu locations while preserving IDs and booking relationships.

To restore locally, create a MySQL database named `duanmoi`, then import the schema followed by the reference seed. The export intentionally omits live customer, booking, staff credential, payment, lock credential, and audit-log rows so personal or operational data is not published in this public repository. The schema for those tables is included.

Example from the project root:

```sh
mysql -u root -p -e "CREATE DATABASE duanmoi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p duanmoi < database/duanmoi_schema.sql
mysql -u root -p duanmoi < database/duanmoi_reference_seed.sql
```

If the database already exists, apply only the location update:

```sh
mysql -u root -p duanmoi < database/update_vung_tau_locations.sql
```
