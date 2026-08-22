# Database Setup

The server uses MySQL database `chat_app`.

## Initialize a fresh database

Run `database/schema.sql` with a MySQL client:

```sql
SOURCE database/schema.sql;
```

Or from the `Server` directory:

```powershell
mysql -u root -p < database/schema.sql
```

The schema creates the `users`, `messages`, and `chat_archives` tables with foreign keys and indexes for conversation history, unread messages, replies, and archives.

## Environment

Copy `.env.example` to `.env` and set the real database password and a long random `JWT_SECRET` before running the server.

The current code expects an existing database. `schema.sql` is for a fresh or controlled database setup; it does not remove existing data.
