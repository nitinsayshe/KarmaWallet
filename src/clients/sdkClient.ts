export abstract class SdkClient {
  public name: string;

  constructor(n: string) {
    this.name = n;
    this._init = this._init.bind(this);
  }

  protected abstract _init (): void;
}
