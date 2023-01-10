export const removeTrailingSlash = (url: string) => {
  let newUrl = url;
  if (newUrl.endsWith('/')) newUrl = newUrl.slice(0, -1);

  return newUrl;
};
