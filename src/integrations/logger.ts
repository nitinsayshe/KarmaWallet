interface ILoggerData {
  group: string;
  count: number | string;
}

export const printTable = (header: string, data: ILoggerData[]) => {
  console.log(`\n${header}`);
  console.log('+-----------------------------------------------+');
  console.log('| Group\t\t\t\t| Count\t\t|');
  console.log('+-----------------------------------------------+');
  data.forEach(({ group, count }) => console.log(`| ${group}| ${count}|`));
  console.log('+-----------------------------------------------+\n');
};
