export abstract class SdkClient {
  public name: string;

  constructor(n: string) {
    this.name = n;
    this._init();
  }

  abstract _init (): void;
}
