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
  concatHex: document.getElementById("concatHex")
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
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
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

function generateKnightPermutation(seed) {
  for (const start of [seed[0] % 16, seed[1] % 16, seed[2] % 16]) {
    const path = knightPath(start, seed);
    if (path.length === 16) return path;
  }
  return Array.from({ length: 16 }, (_, i) => i).sort((a, b) => (seed[a % seed.length] ^ a * 29) - (seed[b % seed.length] ^ b * 29));
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
      calc = `Posisi baru ${idx} ← ambil dari posisi lama ${srcIdx}\n`;
      calc += `Byte di posisi ${srcIdx}: 0x${before[srcIdx].toString(16).padStart(2, "0").toUpperCase()}\n`;
      calc += `Hasil posisi ${idx}: 0x${b0After.toString(16).padStart(2, "0").toUpperCase()}`;
      els.permBox.style.display = "block";
      els.permDisplay.textContent = "Jalur: [" + mat.permutation.join(", ") + "]";
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
  els.decryptCheck.textContent = decrypted === els.plaintext.value ? "OK - plaintext kembali utuh" : "Gagal";
  renderByteTable();
  renderTimeline();
  renderStep();
  renderConcat();
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
  els.playBtn.textContent = "Play";
}

els.encryptBtn.addEventListener("click", run);
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
