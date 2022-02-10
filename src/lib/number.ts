export const convertKgToMT = (num: number) => num * 0.001;

export const formatNumber = new Intl.NumberFormat('en-us', { maximumSignificantDigits: 3 }).format;

export const getRandom = (min: number, max: number) => Math.round(Math.random() * (max - min)) + min;

export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
