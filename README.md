# Converge

## 🚀 Quick Start

Please ensure that you have completed the required [development setup](./CONTRIBUTING.md#development-setup) before proceeding.

### Server

1. Ensure that you have the necessary environment variables:

```sh
cp .env.example .env
```

2. Create your first user account. Connect to your database and run the following commands:

```sql
INSERT INTO new_users (email, is_onedrive_sync_enabled)
VALUES ('some_wog_email@tech.gov.sg', true);
```

3. Start the server with either commands:

```sh
pnpm dev
pnpm dev:watch
```

### API endpoints

1. Before interacting with the chatbot, you need to create a conversation:

```
curl -X POST \
  http://localhost:8001/conversations \
  -H "Content-Type: application/json" \
  -d '{"email": "some_wog_email@tech.gov.sg"}'
```

This endpoint will return the conversationId needed for Messages API endpoint.

2. Interact with the chatbot by creating a message:

```
curl -X POST \
http://localhost:8001/messages \
-H "Content-Type: application/json" \
-d '{"conversationId": "0194a704-74bb-7c49-87b4-71cd477b3ab0", "content": "hello! what can you do for me?"}'
```

### Database

1. Start the CLI with:

| Command                | Action                               |
| :--------------------- | :----------------------------------- |
| `pnpm cli db:plan`     | Generate a migration plan            |
| `pnpm cli db:migrate`  | Execute database migration           |
| `pnpm cli db:rollback` | Rollback a single database migration |
| `pnpm cli db:drop`     | Drop all database tables             |

## Contributing

Contributions to Converge are welcome and highly appreciated. However, before you jump right into it, we would like you to review our [Contribution Guidelines](./CONTRIBUTING.md) to make sure you have a smooth experience contributing to Converge.

## Authors & Contributors

- Alex Ng / [@axxng](https://github.com/axxng)
- Kelly Lim / [@kellylimmm](https://github.com/kellylimmm)
- Lai Ho Lim / [@iamlaiho](https://github.com/iamlaiho)
- Chadin Anuwattanaporn / [@chadinwork](https://github.com/chadinwork)
- Yi Ming Peh / [@yimingiscold](https://github.com/yimingiscold)
