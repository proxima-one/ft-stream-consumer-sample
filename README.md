# Sample NodeJS app to sink Fungible Token data to MongoDB

## Getting Started

### Prepare Environment

- Clone repo
- `yarn install`
- Install [docker compose](https://docs.docker.com/compose/) or provide your own MongoDB endpoint via envvar `MONGODB_ENDPOINT`
- `yarn docker:env` to start MongoDB using shipped docker-compose file (`yarn docker:env:down` to stop MongoDB)

### Run App

- `yarn start` to start app on yor host
- `yarn docker:start` to start app inside docker

## Streams

In this app 2 streams are consumed:

- `eth-main.fungible-token.streams.proxima.one`
- `polygon-mumbai.fungible-token.streams.proxima.one`

Both of them have the same event [schema](https://github.com/proxima-one/stream-schemas/tree/master/packages/fungible-token):

```typescript
export interface NewToken {
  type: "new";

  id: string;
  chain: string;

  contractAddress: string;
  symbol: string;
  name: string;
  totalSupply: string;
  decimals?: number;
}

export interface Transfer {
  type: "transfer";

  id: string;
  chain: string;

  tokenId: string;
  from: string;
  to: string;
  value: string;
}

export interface Approval {
  type: "approval";

  id: string;
  chain: string;

  tokenId: string;
  owner: string;
  spender: string;
  value: string;
}

```

## Stream Size

At the time of writing `eth-main` streams had 1,057,398,958 events, `polygon-mumbai` - 142,684,517. 
It will take some time to fully sink all events to your MongoDB instance:

| Sink Speed    | Estimated Time |
|---------------|----------------|
| 10000 per sec | ~ 28 hours     |
| 5000 per sec  | ~ 56 hours     |
| 3000 per sec  | ~ 93 hours     |
| 2000 per sec  | ~ 144 hours    |
| 1000 per sec  | ~ 277 hours    |

    
