# Deployment

## Docker Compose

1. Change every `change-me` and `replace-with-a-long-random-secret` value in `docker-compose.yml`.
2. Start the stack:

```powershell
docker compose up --build -d
```

3. Open `http://localhost` for the client.
4. Check server and MySQL:

```text
http://localhost:5001/api/health
```

The first MySQL start runs `Server/database/schema.sql` against a new named volume. Existing data is not overwritten by normal restarts.

## Production requirements

- Use HTTPS and set `CLIENT_ORIGIN` to the deployed client origin.
- Use a long random `JWT_SECRET`.
- Set a non-root MySQL user with a strong password.
- Store uploads in persistent object storage or a persistent volume.
- Put the API behind a reverse proxy and restrict CORS to the real client origin.
- Do not expose MySQL publicly.
- Back up the `chat_app` database before migrations.

The current client API URLs default to `http://localhost:5001` for local development. For a remote deployment, replace those URLs with the deployed API origin before building the client.
