function md5cycle(x: number[], k: number[]) {
  let [a, b, c, d] = x

  a = md5RoundF(a, b, c, d, k[0], 7, -680876936)
  d = md5RoundF(d, a, b, c, k[1], 12, -389564586)
  c = md5RoundF(c, d, a, b, k[2], 17, 606105819)
  b = md5RoundF(b, c, d, a, k[3], 22, -1044525330)
  a = md5RoundF(a, b, c, d, k[4], 7, -176418897)
  d = md5RoundF(d, a, b, c, k[5], 12, 1200080426)
  c = md5RoundF(c, d, a, b, k[6], 17, -1473231341)
  b = md5RoundF(b, c, d, a, k[7], 22, -45705983)
  a = md5RoundF(a, b, c, d, k[8], 7, 1770035416)
  d = md5RoundF(d, a, b, c, k[9], 12, -1958414417)
  c = md5RoundF(c, d, a, b, k[10], 17, -42063)
  b = md5RoundF(b, c, d, a, k[11], 22, -1990404162)
  a = md5RoundF(a, b, c, d, k[12], 7, 1804603682)
  d = md5RoundF(d, a, b, c, k[13], 12, -40341101)
  c = md5RoundF(c, d, a, b, k[14], 17, -1502002290)
  b = md5RoundF(b, c, d, a, k[15], 22, 1236535329)

  a = md5RoundG(a, b, c, d, k[1], 5, -165796510)
  d = md5RoundG(d, a, b, c, k[6], 9, -1069501632)
  c = md5RoundG(c, d, a, b, k[11], 14, 643717713)
  b = md5RoundG(b, c, d, a, k[0], 20, -373897302)
  a = md5RoundG(a, b, c, d, k[5], 5, -701558691)
  d = md5RoundG(d, a, b, c, k[10], 9, 38016083)
  c = md5RoundG(c, d, a, b, k[15], 14, -660478335)
  b = md5RoundG(b, c, d, a, k[4], 20, -405537848)
  a = md5RoundG(a, b, c, d, k[9], 5, 568446438)
  d = md5RoundG(d, a, b, c, k[14], 9, -1019803690)
  c = md5RoundG(c, d, a, b, k[3], 14, -187363961)
  b = md5RoundG(b, c, d, a, k[8], 20, 1163531501)
  a = md5RoundG(a, b, c, d, k[13], 5, -1444681467)
  d = md5RoundG(d, a, b, c, k[2], 9, -51403784)
  c = md5RoundG(c, d, a, b, k[7], 14, 1735328473)
  b = md5RoundG(b, c, d, a, k[12], 20, -1926607734)

  a = md5RoundH(a, b, c, d, k[5], 4, -378558)
  d = md5RoundH(d, a, b, c, k[8], 11, -2022574463)
  c = md5RoundH(c, d, a, b, k[11], 16, 1839030562)
  b = md5RoundH(b, c, d, a, k[14], 23, -35309556)
  a = md5RoundH(a, b, c, d, k[1], 4, -1530992060)
  d = md5RoundH(d, a, b, c, k[4], 11, 1272893353)
  c = md5RoundH(c, d, a, b, k[7], 16, -155497632)
  b = md5RoundH(b, c, d, a, k[10], 23, -1094730640)
  a = md5RoundH(a, b, c, d, k[13], 4, 681279174)
  d = md5RoundH(d, a, b, c, k[0], 11, -358537222)
  c = md5RoundH(c, d, a, b, k[3], 16, -722521979)
  b = md5RoundH(b, c, d, a, k[6], 23, 76029189)
  a = md5RoundH(a, b, c, d, k[9], 4, -640364487)
  d = md5RoundH(d, a, b, c, k[12], 11, -421815835)
  c = md5RoundH(c, d, a, b, k[15], 16, 530742520)
  b = md5RoundH(b, c, d, a, k[2], 23, -995338651)

  a = md5RoundI(a, b, c, d, k[0], 6, -198630844)
  d = md5RoundI(d, a, b, c, k[7], 10, 1126891415)
  c = md5RoundI(c, d, a, b, k[14], 15, -1416354905)
  b = md5RoundI(b, c, d, a, k[5], 21, -57434055)
  a = md5RoundI(a, b, c, d, k[12], 6, 1700485571)
  d = md5RoundI(d, a, b, c, k[3], 10, -1894986606)
  c = md5RoundI(c, d, a, b, k[10], 15, -1051523)
  b = md5RoundI(b, c, d, a, k[1], 21, -2054922799)
  a = md5RoundI(a, b, c, d, k[8], 6, 1873313359)
  d = md5RoundI(d, a, b, c, k[15], 10, -30611744)
  c = md5RoundI(c, d, a, b, k[6], 15, -1560198380)
  b = md5RoundI(b, c, d, a, k[13], 21, 1309151649)
  a = md5RoundI(a, b, c, d, k[4], 6, -145523070)
  d = md5RoundI(d, a, b, c, k[11], 10, -1120210379)
  c = md5RoundI(c, d, a, b, k[2], 15, 718787259)
  b = md5RoundI(b, c, d, a, k[9], 21, -343485551)

  x[0] = add32(a, x[0])
  x[1] = add32(b, x[1])
  x[2] = add32(c, x[2])
  x[3] = add32(d, x[3])
}

function md5Common(
  functionResult: number,
  accumulator: number,
  blockValue: number,
  inputData: number,
  shiftAmount: number,
  constant: number,
) {
  accumulator = add32(add32(accumulator, functionResult), add32(inputData, constant))
  return add32((accumulator << shiftAmount) | (accumulator >>> (32 - shiftAmount)), blockValue)
}

function md5RoundF(
  accumulator: number,
  blockValue: number,
  carryValue: number,
  digestValue: number,
  inputData: number,
  shiftAmount: number,
  constant: number,
) {
  return md5Common((blockValue & carryValue) | (~blockValue & digestValue), accumulator, blockValue, inputData, shiftAmount, constant)
}

function md5RoundG(
  accumulator: number,
  blockValue: number,
  carryValue: number,
  digestValue: number,
  inputData: number,
  shiftAmount: number,
  constant: number,
) {
  return md5Common((blockValue & digestValue) | (carryValue & ~digestValue), accumulator, blockValue, inputData, shiftAmount, constant)
}

function md5RoundH(
  accumulator: number,
  blockValue: number,
  carryValue: number,
  digestValue: number,
  inputData: number,
  shiftAmount: number,
  constant: number,
) {
  return md5Common(blockValue ^ carryValue ^ digestValue, accumulator, blockValue, inputData, shiftAmount, constant)
}

function md5RoundI(
  accumulator: number,
  blockValue: number,
  carryValue: number,
  digestValue: number,
  inputData: number,
  shiftAmount: number,
  constant: number,
) {
  return md5Common(carryValue ^ (blockValue | ~digestValue), accumulator, blockValue, inputData, shiftAmount, constant)
}

function md51(input: string) {
  const inputLength = input.length
  const state = [1732584193, -271733879, -1732584194, 271733878]
  let i = 0
  for (i = 64; i <= inputLength; i += 64) {
    md5cycle(state, md5blk(input.substring(i - 64, i)))
  }
  input = input.substring(i - 64)
  const tail = Array(16).fill(0) as number[]
  for (i = 0; i < input.length; i += 1) {
    tail[i >> 2] |= input.charCodeAt(i) << ((i % 4) << 3)
  }
  tail[i >> 2] |= 0x80 << ((i % 4) << 3)
  if (i > 55) {
    md5cycle(state, tail)
    for (let j = 0; j < 16; j += 1) tail[j] = 0
  }
  tail[14] = inputLength * 8
  md5cycle(state, tail)
  return state
}

function md5blk(s: string) {
  const md5blks: number[] = []
  for (let i = 0; i < 64; i += 4) {
    md5blks[i >> 2] =
      s.charCodeAt(i) +
      (s.charCodeAt(i + 1) << 8) +
      (s.charCodeAt(i + 2) << 16) +
      (s.charCodeAt(i + 3) << 24)
  }
  return md5blks
}

function numberToReversedHex(value: number) {
  const hexDigits = '0123456789abcdef'
  let j = 0
  let out = ''
  for (; j < 4; j += 1) {
    out += hexDigits.charAt((value >> (j * 8 + 4)) & 0x0f) + hexDigits.charAt((value >> (j * 8)) & 0x0f)
  }
  return out
}

function convertToHexString(byteArray: number[]) {
  for (let i = 0; i < byteArray.length; i += 1) {
    byteArray[i] = Number(byteArray[i])
  }
  return byteArray.map(numberToReversedHex).join('')
}

function add32(a: number, b: number) {
  return (a + b) & 0xffffffff
}

export function gravatarUrl(email: string, size = 160) {
  const normalized = email.trim().toLowerCase()
  const hash = convertToHexString(md51(normalized))
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`
}
