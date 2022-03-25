export interface IChartDataPoint<T = string> {
  /**
   * a unique key that can be used to identify
   * a subset of this sections data.
   *
   * @example if a line graph contains 2 lines,
   * one for estimate, one for actual, this value
   * can be used to identify which value is which
   */
  label?: T;
  value: number;
}

export interface IChartData<T = string> {
  /**
   * the label to use for this sectio of data
   *
   * @example this would be the text that appears
   * on the x-axis of a line graph, or under the bar
   * for a bar graph
   */
  label: string;
  values: IChartDataPoint<T>[];
}

export interface IChart<T = string> {
  data: IChartData<T>[];
  // additional data to show with the chart, but that
  // wont be shared in the chart itself, like an average
  // number or cards added per user for example.
  metrics?: IChartDataPoint[];
}
