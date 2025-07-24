export function toPriceInfo(cost) {
  if (cost == undefined)
    return;

  const sp = cost % 10;
  const gp = Math.trunc((cost - sp) / 10);
  return {
    gp,
    sp
  }
}