const BLOCK_SIZE = 16;
const ROUNDS = 10;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let trace = [];
let allTraces = [];
let blockCiphertexts = [];
let currentBlock = 0;
let stepIndex = 0;
let timer = null;
let lastMaterials = null;
let lastIv = null;
let lastPlainBlock = null;
let lastMasterSeed = null;
let lastRoundSeeds = null;
let selectedByte = 0;

const els = {
  plaintext: document.getElementById("plaintext"),
  key: document.getElementById("key"),
  encryptBtn: document.getElementById("encryptBtn"),
  prevBtn: document.getElementById("prevBtn"),
  playBtn: document.getElementById("playBtn"),
  nextBtn: document.getElementById("nextBtn"),
  cipherHex: document.getElementById("cipherHex"),
  decryptCheck: document.getElementById("decryptCheck"),
  matrix: document.getElementById("matrix"),
  stepTitle: document.getElementById("stepTitle"),
  roundBadge: document.getElementById("roundBadge"),
  timeline: document.getElementById("timeline"),
  stepExplain: document.getElementById("stepExplain"),
  changeSummary: document.getElementById("changeSummary"),
  beforeHex: document.getElementById("beforeHex"),
  afterHex: document.getElementById("afterHex"),
  byteTable: document.getElementById("byteTable"),
  manualCalc: document.getElementById("manualCalc"),
  roundKeyDisplay: document.getElementById("roundKeyDisplay"),
  permDisplay: document.getElementById("permDisplay"),
  permBox: document.getElementById("permBox"),
  sboxDisplay: document.getElementById("sboxDisplay"),
  sboxBox: document.getElementById("sboxBox"),
  blockSelect: document.getElementById("blockSelect"),
  concatVisual: document.getElementById("concatVisual"),
  concatHex: document.getElementById("concatHex"),
  cipherInput: document.getElementById("cipherInput"),
  decryptBtn: document.getElementById("decryptBtn"),
  decryptOutput: document.getElementById("decryptOutput"),
  plainEntropy: document.getElementById("plainEntropy"),
  cipherEntropy: document.getElementById("cipherEntropy"),
  avalancheValue: document.getElementById("avalancheValue"),
  frequencySummary: document.getElementById("frequencySummary"),
  knightWrap: document.getElementById("knightWrap"),
  knightMoveBoard: document.getElementById("knightMoveBoard"),
  knightStateGrids: document.getElementById("knightStateGrids"),
  knightRoute: document.getElementById("knightRoute"),
  knightSummary: document.getElementById("knightSummary")
};

const STEP_TEXT = {
  Initial: "Plaintext dipotong menjadi blok 16 byte dan ditampilkan sebagai matriks 4x4.",
  "CBC-XOR-IV": "Blok pertama dicampur dengan IV turunan kunci agar state awal berubah.",
  AddRoundKey: "Setiap byte state dicampur dengan round key menggunakan XOR.",
  ChaoticSubBytes: "Setiap nilai byte diganti memakai S-Box dinamis dari logistic chaotic map.",
  KnightPermutation: "Posisi byte dipindahkan mengikuti jalur langkah kuda pada papan 4x4.",
  BitShiftMix: "Bit di dalam setiap byte diputar dengan jumlah rotasi dari round key.",
  ByteDiffusion: "Perubahan satu byte mulai menyebar ke byte lain melalui difusi berantai.",
  FeistelMix: "Mixing invertibel memperkuat penyebaran perubahan di seluruh blok."
};

function toHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const clean = hex.replace(/\s+/g, "");
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new Error("Hex harus berisi pasangan karakter 0-9/A-F.");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function sha256Fallback(bytes) {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const primes = [];
  const hash = [];
  let candidate = 2;
  while (primes.length < 64) {
    let isPrime = true;
    for (let factor = 2; factor * factor <= candidate; factor++) {
      if (candidate % factor === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      primes.push(candidate);
      if (hash.length < 8) {
        hash.push((Math.sqrt(candidate) % 1) * 2 ** 32 | 0);
      }
    }
    candidate++;
  }
  const k = primes.map(prime => (Math.cbrt(prime) % 1) * 2 ** 32 | 0);
  const message = Array.from(bytes);
  const bitLength = message.length * 8;
  message.push(0x80);
  while ((message.length % 64) !== 56) message.push(0);
  for (let i = 7; i >= 0; i--) message.push((bitLength / 2 ** (i * 8)) & 0xff);

  for (let chunk = 0; chunk < message.length; chunk += 64) {
    const words = [];
    for (let i = 0; i < 16; i++) {
      words[i] = (
        (message[chunk + i * 4] << 24) |
        (message[chunk + i * 4 + 1] << 16) |
        (message[chunk + i * 4 + 2] << 8) |
        (message[chunk + i * 4 + 3])
      ) | 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(words[i - 15], 7) ^ rightRotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const s1 = rightRotate(words[i - 2], 17) ^ rightRotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + words[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  const digest = new Uint8Array(32);
  hash.forEach((word, i) => {
    digest[i * 4] = (word >>> 24) & 0xff;
    digest[i * 4 + 1] = (word >>> 16) & 0xff;
    digest[i * 4 + 2] = (word >>> 8) & 0xff;
    digest[i * 4 + 3] = word & 0xff;
  });
  return digest;
}

async function sha256(bytes) {
  if (globalThis.crypto?.subtle) {
    return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
  }
  return sha256Fallback(bytes);
}

function concatBytes(...chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function intBytes(value) {
  return new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
}

function xorBytes(left, right) {
  return Uint8Array.from(left, (value, i) => value ^ right[i]);
}

function shannonEntropy(bytes) {
  if (!bytes.length) return 0;
  const counts = new Map();
  bytes.forEach(byte => counts.set(byte, (counts.get(byte) || 0) + 1));
  let entropy = 0;
  counts.forEach(count => {
    const probability = count / bytes.length;
    entropy -= probability * Math.log2(probability);
  });
  return entropy;
}

function bitDifference(left, right) {
  let total = 0;
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    let diff = left[i] ^ right[i];
    while (diff) {
      total += diff & 1;
      diff >>>= 1;
    }
  }
  return total;
}

function frequencySummary(bytes, limit = 10) {
  const counts = new Map();
  bytes.forEach(byte => counts.set(byte, (counts.get(byte) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([byte, count]) => `0x${byte.toString(16).padStart(2, "0").toUpperCase()}:${count}`)
    .join("  ");
}

function rotl(value, amount) {
  amount %= 8;
  return ((value << amount) | (value >> (8 - amount))) & 0xff;
}

function rotr(value, amount) {
  amount %= 8;
  return ((value >> amount) | (value << (8 - amount))) & 0xff;
}

function inverseArray(values) {
  const inverse = new Array(values.length);
  values.forEach((value, index) => { inverse[value] = index; });
  return inverse;
}

function permute(state, permutation) {
  return Uint8Array.from(permutation, sourceIndex => state[sourceIndex]);
}

function pkcs7Pad(data) {
  const padLen = BLOCK_SIZE - (data.length % BLOCK_SIZE);
  const out = new Uint8Array(data.length + padLen);
  out.set(data);
  out.fill(padLen, data.length);
  return out;
}

function pkcs7Unpad(data) {
  const padLen = data[data.length - 1];
  return data.slice(0, data.length - padLen);
}

function generateSbox(seed, roundIndex) {
  let seedInt = 0n;
  for (const b of seed) seedInt = (seedInt << 8n) + BigInt(b);
  let x = Number((seedInt % 900000n) + 9999n) / 1000000.0;
  const r = 3.99 - ((seed[0] + roundIndex) % 10) / 1000.0;
  const values = [];
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 4; j++) x = r * x * (1.0 - x);
    const score = (Math.floor((x * 1e12) % 2 ** 32) ^ (seed[i % seed.length] << 8) ^ i) >>> 0;
    values.push([score, i]);
  }
  return values.sort((a, b) => a[0] - b[0]).map(item => item[1]);
}

function onwardCount(index, visited) {
  const moves = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
  const row = Math.floor(index / 4);
  const col = index % 4;
  let count = 0;
  for (const [dr, dc] of moves) {
    const nr = row + dr;
    const nc = col + dc;
    const ni = nr * 4 + nc;
    if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && !visited.has(ni)) count++;
  }
  return count;
}

function knightPath(start, seed) {
  const moves = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
  const path = [start];
  const visited = new Set([start]);
  for (let depth = 0; depth < 15; depth++) {
    const current = path[path.length - 1];
    const row = Math.floor(current / 4);
    const col = current % 4;
    const options = [];
    for (const [dr, dc] of moves) {
      const nr = row + dr;
      const nc = col + dc;
      const index = nr * 4 + nc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && !visited.has(index)) {
        const nextVisited = new Set([...visited, index]);
        options.push([onwardCount(index, nextVisited), seed[(depth + index) % seed.length] ^ (index * 17), index]);
      }
    }
    if (!options.length) return [];
    options.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    path.push(options[0][2]);
    visited.add(options[0][2]);
  }
  return path;
}

function knightTargets(index) {
  const moves = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
  const row = Math.floor(index / 4);
  const col = index % 4;
  const targets = [];
  for (const [dr, dc] of moves) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) targets.push(nr * 4 + nc);
  }
  return targets;
}

function generateKnightPermutation(seed) {
  const outputOrder = Array.from({ length: 16 }, (_, i) => i)
    .sort((a, b) => (seed[(a * 3) % seed.length] ^ a * 29) - (seed[(b * 3) % seed.length] ^ b * 29));
  const choices = new Map();
  for (let outputIndex = 0; outputIndex < 16; outputIndex++) {
    choices.set(outputIndex, knightTargets(outputIndex).sort((a, b) =>
      ((seed[(outputIndex + a) % seed.length] ^ a * 17) - (seed[(outputIndex + b) % seed.length] ^ b * 17)) || a - b
    ));
  }
  const assigned = new Map();
  const usedSources = new Set();

  function backtrack() {
    if (assigned.size === 16) return true;
    const remaining = outputOrder.filter(index => !assigned.has(index));
    remaining.sort((a, b) => {
      const freeA = choices.get(a).filter(source => !usedSources.has(source)).length;
      const freeB = choices.get(b).filter(source => !usedSources.has(source)).length;
      return freeA - freeB || outputOrder.indexOf(a) - outputOrder.indexOf(b);
    });
    const outputIndex = remaining[0];
    for (const sourceIndex of choices.get(outputIndex)) {
      if (usedSources.has(sourceIndex)) continue;
      assigned.set(outputIndex, sourceIndex);
      usedSources.add(sourceIndex);
      if (backtrack()) return true;
      usedSources.delete(sourceIndex);
      assigned.delete(outputIndex);
    }
    return false;
  }

  if (!backtrack()) throw new Error("Cannot build knight-move permutation on 4x4 board.");
  return Array.from({ length: 16 }, (_, index) => assigned.get(index));
}

async function buildMaterials(key) {
  const masterSeed = await sha256(textEncoder.encode(key));
  const iv = (await sha256(concatBytes(masterSeed, textEncoder.encode("KCC-IV")))).slice(0, 16);
  const materials = [];
  const roundSeeds = [];
  for (let round = 0; round < ROUNDS; round++) {
    const roundSeed = await sha256(concatBytes(masterSeed, intBytes(round)));
    roundSeeds.push(roundSeed);
    const keyMaterial = await sha256(concatBytes(roundSeed, intBytes(0)));
    const roundKey = keyMaterial.slice(0, 16);
    const sbox = generateSbox(roundSeed, round);
    const permutation = generateKnightPermutation(roundSeed);
    const rotations = Array.from({ length: 16 }, (_, i) => ((roundSeed[i % roundSeed.length] + i + round) % 7) + 1);
    materials.push({ roundKey, sbox, inverseSbox: inverseArray(sbox), permutation, inversePermutation: inverseArray(permutation), rotations });
  }
  return { materials, iv, masterSeed, roundSeeds };
}

function diffuse(state, roundKey) {
  const output = new Uint8Array(16);
  let carry = roundKey[0];
  for (let i = 0; i < 16; i++) {
    const neighbor = i > 0 ? output[i - 1] : roundKey[15];
    output[i] = state[i] ^ carry ^ neighbor ^ ((roundKey[i] + i * 13) & 0xff);
    carry = output[i];
  }
  return output;
}

function undiffuse(state, roundKey) {
  const output = new Uint8Array(16);
  let carry = roundKey[0];
  for (let i = 0; i < 16; i++) {
    const neighbor = i > 0 ? state[i - 1] : roundKey[15];
    output[i] = state[i] ^ carry ^ neighbor ^ ((roundKey[i] + i * 13) & 0xff);
    carry = state[i];
  }
  return output;
}

function feistelMix(state, roundKey) {
  const mixed = Array.from(state);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < 16; i++) {
      const j = (i + 1) % 16;
      const rotation = ((roundKey[(i + pass) % 16] + pass) % 7) + 1;
      mixed[j] ^= rotl((mixed[i] + roundKey[i]) & 0xff, rotation);
    }
  }
  return Uint8Array.from(mixed);
}

function inverseFeistelMix(state, roundKey) {
  const mixed = Array.from(state);
  for (let pass = 2; pass >= 0; pass--) {
    for (let i = 15; i >= 0; i--) {
      const j = (i + 1) % 16;
      const rotation = ((roundKey[(i + pass) % 16] + pass) % 7) + 1;
      mixed[j] ^= rotl((mixed[i] + roundKey[i]) & 0xff, rotation);
    }
  }
  return Uint8Array.from(mixed);
}

function encryptBlock(block, materials, traceSink = null) {
  let state = block;
  materials.forEach((material, round) => {
    state = xorBytes(state, material.roundKey);
    traceSink?.push({ round: round + 1, step: "AddRoundKey", hex: toHex(state) });
    state = Uint8Array.from(state, b => material.sbox[b]);
    traceSink?.push({ round: round + 1, step: "ChaoticSubBytes", hex: toHex(state) });
    state = permute(state, material.permutation);
    traceSink?.push({ round: round + 1, step: "KnightPermutation", hex: toHex(state) });
    state = Uint8Array.from(state, (b, i) => rotl(b, material.rotations[i]));
    traceSink?.push({ round: round + 1, step: "BitShiftMix", hex: toHex(state) });
    state = diffuse(state, material.roundKey);
    traceSink?.push({ round: round + 1, step: "ByteDiffusion", hex: toHex(state) });
    state = feistelMix(state, material.roundKey);
    traceSink?.push({ round: round + 1, step: "FeistelMix", hex: toHex(state) });
  });
  return state;
}

function decryptBlock(block, materials) {
  let state = block;
  [...materials].reverse().forEach(material => {
    state = inverseFeistelMix(state, material.roundKey);
    state = undiffuse(state, material.roundKey);
    state = Uint8Array.from(state, (b, i) => rotr(b, material.rotations[i]));
    state = permute(state, material.inversePermutation);
    state = Uint8Array.from(state, b => material.inverseSbox[b]);
    state = xorBytes(state, material.roundKey);
  });
  return state;
}

async function encryptAndTrace(plaintext, key) {
  const { materials, iv, masterSeed, roundSeeds } = await buildMaterials(key);
  const padded = pkcs7Pad(textEncoder.encode(plaintext));
  let previous = iv;
  const ciphertext = new Uint8Array(padded.length);
  const traces = [];
  const blockResults = [];
  const numBlocks = padded.length / BLOCK_SIZE;

  for (let b = 0; b < numBlocks; b++) {
    const offset = b * BLOCK_SIZE;
    const plainBlock = padded.slice(offset, offset + BLOCK_SIZE);
    const blockTrace = [{ round: 0, step: "Initial", hex: toHex(plainBlock) }];
    const chained = xorBytes(plainBlock, previous);
    blockTrace.push({ round: 0, step: "CBC-XOR-IV", hex: toHex(chained) });
    const encrypted = encryptBlock(chained, materials, blockTrace);
    ciphertext.set(encrypted, offset);
    blockResults.push(toHex(encrypted));
    traces.push(blockTrace);
    previous = encrypted;
  }
  return { ciphertext, traces, blockResults, materials, iv, padded, masterSeed, roundSeeds };
}

async function encryptBytesOnly(plaintextBytes, key) {
  const { materials, iv } = await buildMaterials(key);
  const padded = pkcs7Pad(plaintextBytes);
  let previous = iv;
  const ciphertext = new Uint8Array(padded.length);
  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    const chained = xorBytes(padded.slice(offset, offset + BLOCK_SIZE), previous);
    const encrypted = encryptBlock(chained, materials);
    ciphertext.set(encrypted, offset);
    previous = encrypted;
  }
  return ciphertext;
}

async function renderSecurityAnalysis(plaintext, key, ciphertext) {
  const plaintextBytes = textEncoder.encode(plaintext);
  const modified = new Uint8Array(plaintextBytes.length || 1);
  modified.set(plaintextBytes.length ? plaintextBytes : new Uint8Array([0]));
  modified[0] ^= 0x01;
  const changedCiphertext = await encryptBytesOnly(modified, key);
  const totalBits = Math.min(ciphertext.length, changedCiphertext.length) * 8;
  const avalanche = totalBits ? (bitDifference(ciphertext, changedCiphertext) / totalBits) * 100 : 0;

  els.plainEntropy.textContent = `${shannonEntropy(plaintextBytes).toFixed(4)} bit/byte`;
  els.cipherEntropy.textContent = `${shannonEntropy(ciphertext).toFixed(4)} bit/byte`;
  els.avalancheValue.textContent = `${avalanche.toFixed(2)}%`;
  els.frequencySummary.textContent = frequencySummary(ciphertext);
}

function decrypt(ciphertext, materials, iv) {
  let previous = iv;
  const padded = new Uint8Array(ciphertext.length);
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    const block = ciphertext.slice(offset, offset + 16);
    const decrypted = xorBytes(decryptBlock(block, materials), previous);
    padded.set(decrypted, offset);
    previous = block;
  }
  return textDecoder.decode(pkcs7Unpad(padded));
}

async function decryptCustomCiphertext() {
  try {
    const ciphertext = fromHex(els.cipherInput.value);
    if (ciphertext.length === 0 || ciphertext.length % BLOCK_SIZE !== 0) {
      throw new Error("Panjang ciphertext harus kelipatan 16 byte / 32 hex.");
    }
    const { materials, iv } = await buildMaterials(els.key.value);
    const plaintext = decrypt(ciphertext, materials, iv);
    els.decryptOutput.textContent = `OK → ${plaintext}`;
  } catch (error) {
    els.decryptOutput.textContent = `GAGAL → ${error.message}`;
  }
}

function renderByteTable() {
  if (!allTraces.length) return;
  const padded = pkcs7Pad(textEncoder.encode(els.plaintext.value));
  const offset = currentBlock * 16;
  const block = padded.slice(offset, offset + 16);
  const plain = els.plaintext.value;
  let html = "<tr><th>Pos</th><th>Char</th><th>Dec</th><th>Hex</th></tr>";
  for (let i = 0; i < 16; i++) {
    const globalIdx = offset + i;
    const b = block[i];
    const ch = (globalIdx < plain.length) ? plain[globalIdx] : `[pad:${b}]`;
    const display = ch === " " ? "⎵" : (globalIdx < plain.length ? ch : `pad`);
    html += `<tr><td>${i}</td><td>${display}</td><td>${b}</td><td>${b.toString(16).padStart(2, "0").toUpperCase()}</td></tr>`;
  }
  els.byteTable.innerHTML = html;
}

function currentKnightMaterial(item) {
  const round = item?.round && item.round > 0 ? item.round : 1;
  return lastMaterials?.[round - 1] || null;
}

function knightMoveCells(fromIndex, toIndex) {
  const [fromRow, fromCol] = [Math.floor(fromIndex / 4), fromIndex % 4];
  const [toRow, toCol] = [Math.floor(toIndex / 4), toIndex % 4];
  const rowDelta = toRow - fromRow;
  const colDelta = toCol - fromCol;
  const rowStep = Math.sign(rowDelta);
  const colStep = Math.sign(colDelta);
  const cells = new Map([[fromIndex, "from"], [toIndex, "to"]]);

  if (Math.abs(rowDelta) === 2 && Math.abs(colDelta) === 1) {
    cells.set((fromRow + rowStep) * 4 + fromCol, "leg");
    cells.set(toRow * 4 + fromCol, "turn");
  } else if (Math.abs(rowDelta) === 1 && Math.abs(colDelta) === 2) {
    cells.set(fromRow * 4 + fromCol + colStep, "leg");
    cells.set(fromRow * 4 + toCol, "turn");
  }
  return cells;
}

function renderKnightPath(item, before = null, after = null) {
  const material = currentKnightMaterial(item);
  const isKnightStep = item.step === "KnightPermutation";
  els.knightWrap.classList.toggle("visible", isKnightStep);
  if (!material || !isKnightStep) {
    els.knightMoveBoard.innerHTML = "";
    els.knightStateGrids.innerHTML = "";
    els.knightRoute.textContent = "-";
    els.knightSummary.textContent = "Jalur kuda hanya ditampilkan pada step KnightPermutation.";
    els.knightWrap.classList.remove("permutation-active");
    return;
  }

  const permutation = material.permutation;
  const outputIndex = selectedByte;
  const sourceIndex = permutation[outputIndex];
  const beforeValue = before ? before[sourceIndex].toString(16).padStart(2, "0").toUpperCase() : "--";
  const afterValue = after ? after[outputIndex].toString(16).padStart(2, "0").toUpperCase() : "--";
  const moveCells = knightMoveCells(outputIndex, sourceIndex);
  els.knightWrap.classList.add("permutation-active");
  els.knightSummary.textContent = `Ambil nilai BEFORE posisi ${sourceIndex.toString().padStart(2, "0")} = 0x${beforeValue}, lalu taruh ke AFTER posisi ${outputIndex.toString().padStart(2, "0")} = 0x${afterValue}.`;

  els.knightMoveBoard.innerHTML = "";
  for (let index = 0; index < 16; index++) {
    const role = moveCells.get(index) || "";
    const cell = document.createElement("div");
    cell.className = `knight-move-cell ${role}`;
    cell.dataset.index = index.toString().padStart(2, "0");
    const label = role === "from" ? "AFTER" : role === "to" ? "BEFORE" : role === "turn" ? "TURN" : role === "leg" ? "LEG" : "";
    cell.textContent = label || ".";
    els.knightMoveBoard.appendChild(cell);
  }

  els.knightStateGrids.innerHTML = "";
  const gridSpecs = [
    { title: "BEFORE", bytes: before, activeIndex: sourceIndex, activeClass: "source", caption: `posisi ${sourceIndex.toString().padStart(2, "0")} = 0x${beforeValue}` },
    { title: "AFTER", bytes: after, activeIndex: outputIndex, activeClass: "target", caption: `posisi ${outputIndex.toString().padStart(2, "0")} = 0x${afterValue}` }
  ];
  for (const spec of gridSpecs) {
    const wrapper = document.createElement("div");
    wrapper.className = "knight-state";
    wrapper.innerHTML = `<span>${spec.title}</span>`;
    const grid = document.createElement("div");
    grid.className = "knight-state-grid";
    for (let index = 0; index < 16; index++) {
      const cell = document.createElement("div");
      cell.className = `knight-state-cell${index === spec.activeIndex ? ` ${spec.activeClass}` : ""}`;
      cell.dataset.index = index.toString().padStart(2, "0");
      const value = spec.bytes ? spec.bytes[index].toString(16).padStart(2, "0").toUpperCase() : "--";
      cell.textContent = value;
      grid.appendChild(cell);
    }
    const caption = document.createElement("code");
    caption.textContent = spec.caption;
    wrapper.appendChild(grid);
    wrapper.appendChild(caption);
    els.knightStateGrids.appendChild(wrapper);
  }

  els.knightRoute.textContent = permutation
    .map((sourceIndex, outIndex) => `AFTER${outIndex.toString().padStart(2, "0")}<=BEFORE${sourceIndex.toString().padStart(2, "0")}`)
    .join("  ");
}

function toBin(val) {
  return val.toString(2).padStart(8, "0");
}

function renderDetail() {
  if (!lastMaterials || !trace.length) return;
  const item = trace[stepIndex];
  const prev = trace[Math.max(0, stepIndex - 1)];
  const before = fromHex(prev.hex);
  const after = fromHex(item.hex);
  const round = item.round;
  const mat = round > 0 ? lastMaterials[round - 1] : null;
  const idx = selectedByte;

  // Update label
  document.querySelector("#stepDetail span").textContent = `HITUNG MANUAL (Byte ${idx})`;

  // Round key display with derivation values
  const shortHex = (arr, len) => Array.from(arr).slice(0, len).map(b => b.toString(16).padStart(2, "0")).join("") + "...";
  if (mat) {
    const rIdx = round - 1;
    els.roundKeyDisplay.textContent = Array.from(mat.roundKey, b => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
    document.getElementById("roundKeyBox").querySelector("span").innerHTML =
      `ROUND KEY (Round ${round})<br><small style="color:var(--muted);font-weight:400">` +
      `1. masterSeed = SHA256("${els.key.value.slice(0, 20)}...")<br>` +
      `   → <code style="font-size:10px">${shortHex(lastMasterSeed, 8)}</code><br>` +
      `2. roundSeed = SHA256(masterSeed || ${rIdx})<br>` +
      `   → <code style="font-size:10px">${shortHex(lastRoundSeeds[rIdx], 8)}</code><br>` +
      `3. roundKey = SHA256(roundSeed || 0)[0:16]<br>` +
      `   → nilai di atas</small>`;
  } else if (lastIv) {
    els.roundKeyDisplay.textContent = Array.from(lastIv, b => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
    document.getElementById("roundKeyBox").querySelector("span").innerHTML =
      `IV (Initialization Vector)<br><small style="color:var(--muted);font-weight:400">` +
      `1. masterSeed = SHA256("${els.key.value.slice(0, 20)}...")<br>` +
      `   → <code style="font-size:10px">${shortHex(lastMasterSeed, 8)}</code><br>` +
      `2. IV = SHA256(masterSeed || "KCC-IV")[0:16]<br>` +
      `   → nilai di atas</small>`;
  }

  // Manual calculation for selected byte
  let calc = "";
  const b0Before = before[idx];
  const b0After = after[idx];
  const plain = els.plaintext.value;
  const plainChar = plain[idx] || "?";
  const displayChar = plainChar === " " ? "(spasi)" : `'${plainChar}'`;

  switch (item.step) {
    case "Initial":
      calc = `Plaintext byte ${idx}: ${displayChar}\n`;
      calc += `ASCII code: ${b0After} (desimal)\n`;
      calc += `Hex: 0x${b0After.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `Biner: ${toBin(b0After)}`;
      break;
    case "CBC-XOR-IV":
      calc = `State[${idx}] XOR IV[${idx}]\n`;
      calc += `${toBin(b0Before)} (0x${b0Before.toString(16).padStart(2, "0").toUpperCase()}) ← state\n`;
      calc += `${toBin(lastIv[idx])} (0x${lastIv[idx].toString(16).padStart(2, "0").toUpperCase()}) ← IV\n`;
      calc += `──────── XOR\n`;
      calc += `${toBin(b0After)} (0x${b0After.toString(16).padStart(2, "0").toUpperCase()}) ← hasil\n\n`;
      calc += `IV dari mana?\n`;
      calc += `IV = SHA256(SHA256(key) || "KCC-IV")[0:16]\n`;
      calc += `→ deterministik: key sama = IV sama`;
      break;
    case "AddRoundKey":
      const rIdx = round - 1;
      calc = `State[${idx}] XOR RoundKey[${idx}]\n`;
      calc += `${toBin(b0Before)} (0x${b0Before.toString(16).padStart(2, "0").toUpperCase()}) ← state\n`;
      calc += `${toBin(mat.roundKey[idx])} (0x${mat.roundKey[idx].toString(16).padStart(2, "0").toUpperCase()}) ← key\n`;
      calc += `──────── XOR\n`;
      calc += `${toBin(b0After)} (0x${b0After.toString(16).padStart(2, "0").toUpperCase()}) ← hasil\n\n`;
      calc += `Round key dari mana?\n`;
      calc += `roundSeed = SHA256(masterSeed || ${rIdx})\n`;
      calc += `roundKey = SHA256(roundSeed || 0)[0:16]`;
      break;
    case "ChaoticSubBytes":
      calc = `S-Box lookup:\n`;
      calc += `Input : 0x${b0Before.toString(16).padStart(2, "0").toUpperCase()} (desimal ${b0Before})\n`;
      calc += `S-Box[${b0Before}] = ${b0After}\n`;
      calc += `Output: 0x${b0After.toString(16).padStart(2, "0").toUpperCase()} (desimal ${b0After})`;
      els.sboxBox.style.display = "block";
      const entries = [];
      for (let i = 0; i < 16; i++) {
        const v = before[i];
        entries.push(`[${v.toString(16).padStart(2, "0")}]→${mat.sbox[v].toString(16).padStart(2, "0")}`);
      }
      els.sboxDisplay.textContent = entries.join("  ");
      break;
    case "KnightPermutation":
      const srcIdx = mat.permutation[idx];
      calc = `AFTER posisi ${idx} diisi dari BEFORE posisi ${srcIdx}\n`;
      calc += `BEFORE[${srcIdx}] = 0x${before[srcIdx].toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `AFTER[${idx}]  = 0x${b0After.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `Angka ${srcIdx} dan ${idx} adalah nomor kecil di kiri atas cell matriks.`;
      els.permBox.style.display = "block";
      els.permDisplay.textContent = mat.permutation
        .map((sourceIndex, outIndex) => `AFTER${outIndex.toString().padStart(2, "0")}<=BEFORE${sourceIndex.toString().padStart(2, "0")}`)
        .join("  ");
      break;
    case "BitShiftMix":
      const rot = mat.rotations[idx];
      calc = `Rotasi kiri ${rot} bit (byte ${idx}):\n`;
      calc += `Sebelum: ${toBin(b0Before)} (0x${b0Before.toString(16).padStart(2, "0").toUpperCase()})\n`;
      calc += `         ${"←".repeat(rot)} geser kiri ${rot}\n`;
      calc += `Sesudah: ${toBin(b0After)} (0x${b0After.toString(16).padStart(2, "0").toUpperCase()})`;
      break;
    case "ByteDiffusion":
      const carry = idx === 0 ? mat.roundKey[0] : after[idx - 1] !== undefined ? fromHex(item.hex)[idx - 1] : 0;
      const neighbor = idx > 0 ? before[idx - 1] : mat.roundKey[15];
      const keyMix = (mat.roundKey[idx] + idx * 13) & 0xff;
      calc = `Diffuse byte[${idx}]:\n`;
      calc += `input[${idx}]  = 0x${b0Before.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `carry     = 0x${(idx === 0 ? mat.roundKey[0] : fromHex(prev.hex)[idx]).toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `neighbor  = 0x${neighbor.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `key_mix   = (key[${idx}]+${idx}×13) & FF = 0x${keyMix.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `XOR semua → 0x${b0After.toString(16).padStart(2, "0").toUpperCase()}`;
      break;
    case "FeistelMix":
      calc = `Feistel 3-pass mixing (byte ${idx}):\n`;
      calc += `Byte[j] ^= RotL((Byte[i] + Key[i]) & FF, rot)\n`;
      calc += `Sebelum[${idx}]: 0x${b0Before.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `Sesudah[${idx}]: 0x${b0After.toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `(3 pass × 16 operasi = 48 XOR total)`;
      break;
    default:
      calc = `State byte ${idx}: 0x${b0After.toString(16).padStart(2, "0").toUpperCase()}`;
  }

  els.manualCalc.textContent = calc;

  if (item.step !== "KnightPermutation") els.permBox.style.display = "none";
  if (item.step !== "ChaoticSubBytes") els.sboxBox.style.display = "none";
}

function renderStep() {
  const item = trace[stepIndex];
  const previous = trace[Math.max(0, stepIndex - 1)];
  const before = fromHex(previous.hex);
  const after = fromHex(item.hex);
  const changed = after.filter((byte, index) => byte !== before[index]).length;
  const changedSamples = [];
  for (let i = 0; i < after.length && changedSamples.length < 4; i++) {
    if (after[i] !== before[i]) {
      changedSamples.push(`${i.toString().padStart(2, "0")}: ${before[i].toString(16).padStart(2, "0").toUpperCase()} -> ${after[i].toString(16).padStart(2, "0").toUpperCase()}`);
    }
  }
  els.stepTitle.textContent = item.step;
  els.roundBadge.textContent = `Round ${item.round}`;
  els.stepExplain.textContent = STEP_TEXT[item.step] || "State berubah sesuai transformasi round.";
  els.changeSummary.textContent = stepIndex === 0
    ? "State awal dari blok plaintext pertama."
    : `${changed}/16 byte berubah. Contoh: ${changedSamples.join(", ") || "posisi byte dipertahankan"}.`;
  els.beforeHex.textContent = stepIndex === 0 ? "-" : previous.hex.toUpperCase();
  els.afterHex.textContent = item.hex.toUpperCase();
  els.matrix.innerHTML = "";
  after.forEach((byte, index) => {
    const cell = document.createElement("div");
    const changedClass = stepIndex > 0 && byte !== before[index] ? " changed" : "";
    const selectedClass = index === selectedByte ? " selected" : "";
    cell.className = `cell active ${item.step}${changedClass}${selectedClass}`;
    cell.dataset.index = index.toString().padStart(2, "0");
    cell.textContent = byte.toString(16).padStart(2, "0").toUpperCase();
    cell.addEventListener("click", () => {
      selectedByte = index;
      renderStep();
    });
    els.matrix.appendChild(cell);
  });
  renderKnightPath(item, before, after);
  [...els.timeline.children].forEach((tick, index) => tick.classList.toggle("current", index === stepIndex));
  renderDetail();
}

function renderTimeline() {
  els.timeline.innerHTML = "";
  trace.forEach((item, index) => {
    const tick = document.createElement("button");
    tick.className = "tick";
    tick.textContent = `R${item.round} · ${item.step}`;
    tick.addEventListener("click", () => {
      stepIndex = index;
      renderStep();
    });
    els.timeline.appendChild(tick);
  });
}

function renderConcat() {
  let html = "";
  blockCiphertexts.forEach((hex, i) => {
    const cls = i === currentBlock ? "concat-block active" : "concat-block";
    const label = `Blok ${i + 1}`;
    html += `<div class="${cls}" data-block="${i}"><span>${label}</span><code>${hex}</code></div>`;
    if (i < blockCiphertexts.length - 1) html += ``;
  });
  els.concatVisual.innerHTML = html;
  els.concatHex.textContent = blockCiphertexts.join("");
  els.concatVisual.querySelectorAll(".concat-block").forEach(el => {
    el.addEventListener("click", () => {
      currentBlock = parseInt(el.dataset.block);
      els.blockSelect.value = currentBlock;
      switchBlock();
    });
  });
}

function switchBlock() {
  trace = allTraces[currentBlock];
  stepIndex = 0;
  selectedByte = 0;
  renderByteTable();
  renderTimeline();
  renderStep();
  renderConcat();
}

async function run() {
  const result = await encryptAndTrace(els.plaintext.value, els.key.value);
  allTraces = result.traces;
  blockCiphertexts = result.blockResults;
  lastMaterials = result.materials;
  lastIv = result.iv;
  lastMasterSeed = result.masterSeed;
  lastRoundSeeds = result.roundSeeds;
  currentBlock = 0;
  trace = allTraces[0];
  stepIndex = 0;
  selectedByte = 0;
  lastPlainBlock = result.padded.slice(0, 16);

  // Populate block selector
  const numBlocks = allTraces.length;
  els.blockSelect.innerHTML = "";
  const plainBytes = textEncoder.encode(els.plaintext.value);
  const padded = result.padded;
  for (let i = 0; i < numBlocks; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    const chunk = padded.slice(i * 16, (i + 1) * 16);
    let preview = "";
    for (let j = 0; j < 16; j++) {
      const b = chunk[j];
      preview += (b >= 32 && b < 127) ? String.fromCharCode(b) : ".";
    }
    opt.textContent = `Blok ${i + 1}: "${preview}"`;
    els.blockSelect.appendChild(opt);
  }

  const decrypted = decrypt(result.ciphertext, result.materials, result.iv);
  els.cipherHex.textContent = toHex(result.ciphertext);
  els.cipherInput.value = toHex(result.ciphertext).toUpperCase();
  els.decryptCheck.textContent = decrypted === els.plaintext.value ? "OK - plaintext kembali utuh" : "Gagal";
  els.decryptOutput.textContent = `OK → ${decrypted}`;
  renderByteTable();
  renderTimeline();
  renderStep();
  renderConcat();
  await renderSecurityAnalysis(els.plaintext.value, els.key.value, result.ciphertext);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
  els.playBtn.textContent = "Play";
}

els.encryptBtn.addEventListener("click", run);
els.decryptBtn.addEventListener("click", decryptCustomCiphertext);
els.blockSelect.addEventListener("change", () => {
  currentBlock = parseInt(els.blockSelect.value);
  switchBlock();
});
els.prevBtn.addEventListener("click", () => {
  stopTimer();
  stepIndex = Math.max(0, stepIndex - 1);
  renderStep();
});
els.nextBtn.addEventListener("click", () => {
  stopTimer();
  stepIndex = Math.min(trace.length - 1, stepIndex + 1);
  renderStep();
});
els.playBtn.addEventListener("click", () => {
  if (timer) {
    stopTimer();
    return;
  }
  els.playBtn.textContent = "Pause";
  timer = setInterval(() => {
    stepIndex = (stepIndex + 1) % trace.length;
    renderStep();
  }, 650);
});

run();
