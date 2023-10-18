export const arrayLengthIsFalsyOrZero = <ArrayType>(t: Array<ArrayType>): boolean => !t?.length || t.length === 0;
