import {Db} from "mongodb";

export class StreamStateTracker {
  public constructor(private readonly db: Db) { }

  public async findStreamState(stream: string): Promise<string> {
    const streamStateDoc = await this.db.collection("StreamState").findOne({
      _id: stream
    });

    return streamStateDoc ? streamStateDoc.state : "";
  }

  public async storeStreamState(stream: string, state: string): Promise<void> {
    await this.db.collection("StreamState").replaceOne({_id: stream}, {state: state}, {upsert: true});
  }
}
