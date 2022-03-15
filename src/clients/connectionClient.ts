export abstract class ConnectionClient {
  public name: string;
  private _connectionPromise: Promise<any>;

  constructor(n: string) {
    this.name = n;
  }

  abstract _connect (): Promise<void>;

  init = () => {
    if (!this._connectionPromise) this._connectionPromise = this._connect();
    return this._connectionPromise;
  };
}
