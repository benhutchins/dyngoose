# Upgrade from v3 to v4

* Upgraded Dyngoose to use `@aws-sdk/client-dynamodb`, removed use of `aws-sdk`.
* Point-in-time recovery is enabled by default for all tables, specify `backup`
  as false in table metadata to disable.
* The default Billing Mode for tables has been changed to `PAY_PER_REQUEST`
  instead of `PROVISIONED`.
* Sets attributes (`StringSet`, `NumberSet`, and `BinarySet`) now use native
  `Set` interfaces. Previously, set attributes used arrays. Sets ensures the
  values within the set are unique and removed the need for the
  `Table.updateSet` utility method.
* `Table.updateSet` utility method has been deleted.
* Moved TypeScript-generated JS files from `dist/` to `lib/`. This will affect
  import paths for anyone including a file that wasn't exported at the
  top-level.