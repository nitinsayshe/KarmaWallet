export const exec = async () => {
  console.log('\ngenerating user impact totals...');

  try {
    console.log('>>>>> works...');
  } catch (err) {
    console.log('[-] error loading transactions');
    console.log(err);
  }
};
