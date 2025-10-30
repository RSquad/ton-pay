export const shortenAddress = (
  address: string,
  charsBefore: number = 4,
  charsAfter: number = 4
): string => {
  if (address.length < charsBefore + charsAfter + 1) {
    throw new Error("Invalid length");
  }
  return `${address.slice(0, charsBefore)}...${address.slice(-charsAfter)}`;
};
