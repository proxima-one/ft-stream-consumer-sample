import * as ft from "@proximaone/stream-schema-fungible-token";

import {ProximaStreamsClient, State, StreamReader} from "@proximaone/stream-client-js";
import {MongoDbSink} from "./mongo/sink";
import {DeleteDocument, DocumentMetadata, DocumentUpdate, SetDocumentContent} from "./mongo/documents";
import {Decimal128, MongoClient} from "mongodb";
import {StreamStateTracker} from "./mongo/streamStateTracker";

const mongoDbEndpoint = process.env["MONGODB_ENDPOINT"] || "mongodb://user:pass@localhost:27017/fungible-tokens?authSource=admin";
const streamsClient = new ProximaStreamsClient("streams.proxima.one:443");
const readTimeoutMs = 1000;
const readBatchSize = 5000;
let stopped = false;

async function main() {
  await Promise.all([
    sinkFungibleTokenEventStream("eth-main.fungible-token.streams.proxima.one"),
    sinkFungibleTokenEventStream("polygon-mumbai.fungible-token.streams.proxima.one"),
  ]);
}

async function sinkFungibleTokenEventStream(stream: string): Promise<void> {
  const mongoClient = new MongoClient(mongoDbEndpoint);
  await mongoClient.connect();
  let mongoDb = mongoClient.db();

  const documentSink = new MongoDbSink(mongoDb);
  const stateTracker = new StreamStateTracker(mongoDb);
  const currentState = new State((await stateTracker.findStreamState(stream)));

  console.log(`start sinking events from ${stream} at ${currentState.id}`);
  const streamReader = new StreamReader(streamsClient, stream, currentState);

  const startedAt = new Date().getTime();
  let processed = 0;
  while (!stopped) {
    const transitions = await streamReader.tryRead(readBatchSize, readTimeoutMs);

    if (transitions.length == 0)
      continue;

    const documentUpdates = transitions.map(t => {
      const payload = JSON.parse(t.event.payload.toString("utf8")) as ft.streams.FungibleTokenStreamEvent;

      switch (payload.type) {
        case "new": {

          return new DocumentUpdate(
            new DocumentMetadata(payload.id, "Tokens"),
            t.event.undo ? new DeleteDocument() : new SetDocumentContent({
              chain: payload.chain,
              contract: payload.contractAddress,
              symbol: payload.symbol,
              name: payload.name,
              totalSupply: Decimal128.fromString(payload.totalSupply),
              totalSupplyOriginal: payload.totalSupply,
              decimals: payload.decimals ?? 0
            }),
          );
        }
        case "approval": {
          return new DocumentUpdate(
            new DocumentMetadata(payload.id, "Approvals"),
            t.event.undo ? new DeleteDocument() : new SetDocumentContent({
              tokenId: payload.tokenId,
              owner: payload.owner,
              spender: payload.spender,
              value: Decimal128.fromString(payload.value),
              valueOriginal: payload.value,
              ref: payload.ref,
            }),
          );
        }
        case "transfer": return new DocumentUpdate(
          new DocumentMetadata(payload.id, "Transfers"),
          t.event.undo ? new DeleteDocument() : new SetDocumentContent({
            tokenId: payload.tokenId,
            from: payload.from,
            to: payload.to,
            value: Decimal128.fromString(payload.value),
            valueOriginal: payload.value,
            ref: payload.ref,
          }),
        );
      }
    });

    await documentSink.sinkDocumentUpdates(documentUpdates, {ordered: true});

    const lastState = transitions[transitions.length-1].newState;

    await stateTracker.storeStreamState(stream, lastState.id);

    processed += transitions.length;
    const speed = Math.floor(processed / (new Date().getTime() - startedAt) * 1000) ;
    console.log(`sinked ${stream} to ${lastState.id}. avg speed: ${speed} events/sec`);
  }

  await mongoClient.close();
}

main().catch(err => {
  stopped = true;
  console.error(err);
});
