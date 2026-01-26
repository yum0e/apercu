export * from "./state.js";
export * from "./events.js";
export * from "./update.js";
export * from "./view.js";
export * from "./runtime.js";

// 40 removed lines, 55 added lines = valid diff for scrolling test
export const DEMO_DIFF = `--- a/src/database.ts
+++ b/src/database.ts
@@ -1,40 +1,55 @@
-import mysql from 'mysql';
-
-let connection = null;
-
-function connect() {
-  connection = mysql.createConnection({
-    host: process.env.DB_HOST,
-    user: process.env.DB_USER,
-    password: process.env.DB_PASS,
-    database: process.env.DB_NAME
-  });
-  connection.connect();
-}
-
-function disconnect() {
-  if (connection) {
-    connection.end();
-  }
-}
-
-function query(sql, params, callback) {
-  if (!connection) {
-    connect();
-  }
-  connection.query(sql, params, function(error, results) {
-    if (error) {
-      callback(error, null);
-      return;
-    }
-    callback(null, results);
-  });
-}
-
-function getUser(id, callback) {
-  query('SELECT * FROM users WHERE id = ?', [id], callback);
-}
-
-function getAllUsers(callback) {
-  query('SELECT * FROM users', [], callback);
-}
+import { Pool, PoolClient } from 'pg';
+
+interface User {
+  id: number;
+  name: string;
+  email: string;
+  createdAt: Date;
+  updatedAt: Date;
+}
+
+interface DatabaseConfig {
+  host: string;
+  user: string;
+  password: string;
+  database: string;
+  maxConnections: number;
+}
+
+class Database {
+  private pool: Pool;
+
+  constructor(config: DatabaseConfig) {
+    this.pool = new Pool({
+      host: config.host,
+      user: config.user,
+      password: config.password,
+      database: config.database,
+      max: config.maxConnections,
+      idleTimeoutMillis: 30000,
+      connectionTimeoutMillis: 2000,
+    });
+  }
+
+  async connect(): Promise<void> {
+    const client = await this.pool.connect();
+    client.release();
+  }
+
+  async disconnect(): Promise<void> {
+    await this.pool.end();
+  }
+
+  async getUser(id: number): Promise<User | null> {
+    const result = await this.pool.query<User>(
+      'SELECT * FROM users WHERE id = $1',
+      [id]
+    );
+    return result.rows[0] ?? null;
+  }
+
+  async getAllUsers(): Promise<User[]> {
+    const result = await this.pool.query<User>('SELECT * FROM users');
+    return result.rows;
+  }
+}
`;
