# Cheat Sheet: Penjelasan Manual KCC-128 (Untuk Demo ke Dosen)

**Cipher:** Knight-Chaos Cipher (KCC-128)  
**Blok:** 16 byte (128 bit) = matriks 4×4  
**Round:** 10 kali  
**Contoh Plaintext:** `Cyber Security T` (tepat 16 byte)  
**Contoh Key:** `KCC-24.55.2714-Muhammad-Rizky-Hajar`

---

## RINGKASAN CEPAT: Apa yang Terjadi

```
Plaintext → XOR IV → [Round 1..10: 6 langkah] → Ciphertext
```

Setiap round ada 6 langkah:
1. AddRoundKey (XOR dengan kunci round)
2. ChaoticSubBytes (ganti byte pakai tabel)
3. KnightPermutation (acak posisi pakai pola kuda catur)
4. BitShiftMix (geser bit dalam tiap byte)
5. ByteDiffusion (efek berantai antar byte)
6. FeistelMix (campur berpasangan)

---

## STEP 0: Plaintext → Byte (Cara Mengubah Teks ke Byte)

### Apa itu Byte?

Byte = angka 0–255 (8 bit). Komputer menyimpan semua data sebagai byte.
Teks diubah ke byte pakai tabel **ASCII** (American Standard Code for Information Interchange).

### Tabel ASCII yang Relevan

| Karakter | Desimal | Hex | Biner |
|----------|---------|-----|-------|
| (spasi)  | 32      | 20  | 00100000 |
| 0        | 48      | 30  | 00110000 |
| 3        | 51      | 33  | 00110011 |
| A        | 65      | 41  | 01000001 |
| C        | 67      | 43  | 01000011 |
| K        | 75      | 4B  | 01001011 |
| S        | 83      | 53  | 01010011 |
| T        | 84      | 54  | 01010100 |
| b        | 98      | 62  | 01100010 |
| c        | 99      | 63  | 01100011 |
| e        | 101     | 65  | 01100101 |
| i        | 105     | 69  | 01101001 |
| r        | 114     | 72  | 01110010 |
| t        | 116     | 74  | 01110100 |
| u        | 117     | 75  | 01110101 |
| y        | 121     | 79  | 01111001 |

### Cara Konversi: Cukup Lihat Tabel

Contoh teks: `Cyber Security T`

```
C → 67 (desimal) → 0x43 (hex) → 01000011 (biner)
y → 121          → 0x79       → 01111001
b → 98           → 0x62       → 01100010
e → 101          → 0x65       → 01100101
r → 114          → 0x72       → 01110010
  → 32 (spasi)   → 0x20       → 00100000
S → 83           → 0x53       → 01010011
e → 101          → 0x65       → 01100101
c → 99           → 0x63       → 01100011
u → 117          → 0x75       → 01110101
r → 114          → 0x72       → 01110010
i → 105          → 0x69       → 01101001
t → 116          → 0x74       → 01110100
y → 121          → 0x79       → 01111001
  → 32 (spasi)   → 0x20       → 00100000
T → 84           → 0x54       → 01010100
```

### Rumus Cepat (Kalau Mau Hitung Sendiri)

```
Huruf besar: A=65, B=66, ..., Z=90
    → Rumus: posisi alfabet + 64
    → C = huruf ke-3, jadi 3 + 64 = 67

Huruf kecil: a=97, b=98, ..., z=122
    → Rumus: posisi alfabet + 96
    → y = huruf ke-25, jadi 25 + 96 = 121

Angka:  0=48, 1=49, ..., 9=57
    → Rumus: angka + 48

Spasi: selalu 32
```

### Desimal → Hex (Cara Konversi)

```
Contoh: 67 (desimal) → berapa hex?

67 ÷ 16 = 4 sisa 3
         → digit pertama: 4
         → digit kedua:   3
         → Hex: 0x43 ✓

Contoh: 121 (desimal) → berapa hex?

121 ÷ 16 = 7 sisa 9
         → digit pertama: 7
         → digit kedua:   9
         → Hex: 0x79 ✓

Catatan: sisa 10=A, 11=B, 12=C, 13=D, 14=E, 15=F
```

### Kalau Teks Lebih Panjang dari 16 Byte?

Cipher bekerja per blok 16 byte. Kalau teks lebih panjang:
- Potong per 16 byte
- Blok terakhir yang kurang dari 16 byte ditambah **padding** (PKCS#7)

Contoh padding:
```
Teks: "Hello" = 5 byte
Butuh 16, kurang 11
Tambah 11 byte bernilai 0x0B (= 11 desimal):

48 65 6C 6C 6F 0B 0B 0B 0B 0B 0B 0B 0B 0B 0B 0B
H  e  l  l  o  [────── 11 byte padding ──────────]
```

---

### Hasil Konversi Plaintext Kita

Teks `Cyber Security T` diubah ke angka (kode ASCII/UTF-8):

| Huruf | C | y | b | e | r | (spasi) | S | e | c | u | r | i | t | y | (spasi) | T |
|-------|---|---|---|---|---|---------|---|---|---|---|---|---|---|---|---------|---|
| Hex   | 43| 79| 62| 65| 72| 20      | 53| 65| 63| 75| 72| 69| 74| 79| 20      | 54|
| Posisi| 0 | 1 | 2 | 3 | 4 | 5       | 6 | 7 | 8 | 9 | 10| 11| 12| 13| 14      | 15|

Disusun jadi matriks 4×4:

```
| 43 | 79 | 62 | 65 |
| 72 | 20 | 53 | 65 |
| 63 | 75 | 72 | 69 |
| 74 | 79 | 20 | 54 |
```

---

## STEP 0b: XOR dengan IV (CBC Mode)

IV dihitung dari kunci: `29 23 3E 98 5E 3C DF CC DF AA 18 C1 19 46 E2 A0`

Operasi XOR byte per byte:

```
Plaintext:  43  79  62  65  72  20  53  65  63  75  72  69  74  79  20  54
IV:         29  23  3E  98  5E  3C  DF  CC  DF  AA  18  C1  19  46  E2  A0
            ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──
Hasil:      6A  5A  5C  FD  2C  1C  8C  A9  BC  DF  6A  A8  6D  3F  C2  F4
```

Contoh hitung manual (byte 0):
- `0x43 XOR 0x29`
- Biner: `01000011 XOR 00101001 = 01101010` = `0x6A` ✓

**Kenapa XOR dengan IV?** Supaya plaintext yang sama dengan kunci yang sama tidak selalu menghasilkan ciphertext yang sama (kalau ada blok kedua, dia di-XOR dengan ciphertext blok sebelumnya).

---

## ROUND 1: Langkah demi Langkah

### 1. AddRoundKey

Round key 1: `78 44 BE 67 85 39 A1 90 D0 91 39 26 92 06 F0 B3`

```
State:      6A  5A  5C  FD  2C  1C  8C  A9  BC  DF  6A  A8  6D  3F  C2  F4
Round Key:  78  44  BE  67  85  39  A1  90  D0  91  39  26  92  06  F0  B3
            ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──  ──
Hasil:      12  1E  E2  9A  A9  25  2D  39  6C  4E  53  8E  FF  39  32  47
```

Contoh byte 0: `0x6A XOR 0x78 = 0x12`

**Analogi:** Seperti mengunci isi locker dengan kode rahasia. Tanpa kode (key), isi tidak bisa dikembalikan.

---

### 2. ChaoticSubBytes (S-Box Dinamis)

Setiap byte diganti menggunakan tabel substitusi (S-Box) yang dibuat dari chaotic map.

S-Box ini seperti "kamus rahasia" — byte `0x12` dicari di tabel, hasilnya `0xCD`.

```
Sebelum:  12  1E  E2  9A  A9  25  2D  39  6C  4E  53  8E  FF  39  32  47
Sesudah:  CD  4E  B1  DA  A9  93  24  29  E9  64  E0  96  66  29  7E  F9
```

Contoh:
- Byte 0: `0x12` → masuk S-Box → keluar `0xCD`
- Byte 1: `0x1E` → masuk S-Box → keluar `0x4E`

**Analogi:** Seperti codebook dimana huruf A jadi Z, B jadi M, dst. Tapi codebook-nya berubah setiap round!

---

### 3. KnightPermutation (Langkah Kuda Catur)

Posisi byte diacak mengikuti pola langkah kuda catur di papan 4×4.

Pola round 1: `[5, 7, 2, 3, 4, 8, 0, 1, 6, 14, 15, 9, 12, 10, 13, 11]`

Artinya:
- Posisi baru 0 ← ambil dari posisi lama 5
- Posisi baru 1 ← ambil dari posisi lama 7
- Posisi baru 2 ← ambil dari posisi lama 2 (tetap)
- dst.

```
Sebelum:  CD  4E  B1  DA  A9  93  24  29  E9  64  E0  96  66  29  7E  F9
                                ↓
Sesudah:  93  29  B1  DA  A9  E9  CD  4E  24  7E  F9  64  66  E0  29  96
```

Contoh: posisi 0 baru diisi dari posisi 5 lama → `0x93`

**Analogi:** Bayangkan 16 kartu di meja 4×4. Kuda catur melompat dari kotak ke kotak. Urutan lompatan menentukan urutan baru kartu.

Visualisasi langkah kuda di papan 4×4:
```
 0  1  2  3          Kuda bisa lompat:
 4  5  6  7          2 kotak + 1 kotak (bentuk L)
 8  9  10 11         Contoh: dari posisi 0 bisa ke 6, 9
12 13  14 15                  dari posisi 5 bisa ke 2, 8, 14, 11
```

---

### 4. BitShiftMix (Rotasi Bit)

Setiap byte dirotasi ke kiri sejumlah bit tertentu (ditentukan oleh round seed).

Rotasi round 1: `[4, 1, 4, 6, 5, 5, 7, 2, 6, 4, 3, 7, 5, 3, 3, 1]`

```
Sebelum:  93  29  B1  DA  A9  E9  CD  4E  24  7E  F9  64  66  E0  29  96
Sesudah:  39  52  1B  B6  35  3D  E6  39  09  E7  CF  32  CC  07  49  2D
```

Contoh byte 0: `0x93` rotasi kiri 4
- `0x93` = `10010011`
- Geser kiri 4: `00111001` = `0x39` ✓

**Analogi:** Seperti memutar angka di gembok kombinasi — angkanya sama tapi posisinya bergeser.

---

### 5. ByteDiffusion (Efek Domino)

Setiap byte di-XOR dengan byte sebelumnya (carry) dan round key. Ini membuat perubahan 1 byte menyebar ke semua byte setelahnya.

```
Sebelum:  39  52  1B  B6  35  3D  E6  39  09  E7  CF  32  CC  07  49  2D
Sesudah:  8A  03  C3  38  8C  47  09  D2  31  E1  74  87  E2  A8  EF  5B
```

Rumus sederhana:
```
output[0] = input[0] XOR carry XOR neighbor XOR (key[0] + 0×13)
output[1] = input[1] XOR output[0] XOR neighbor XOR (key[1] + 1×13)
...
```

**Analogi:** Seperti efek domino — jatuhkan satu, semua ikut jatuh. Ubah 1 byte di awal, semua byte setelahnya berubah.

---

### 6. FeistelMix (Pencampuran Pasangan)

Byte-byte dicampur berpasangan dalam 3 kali putaran (pass). Byte[i] memengaruhi byte[i+1] melalui rotasi dan XOR.

```
Sebelum:  8A  03  C3  38  8C  47  09  D2  31  E1  74  87  E2  A8  EF  5B
Sesudah:  10  F7  9B  1C  DA  B1  C8  37  44  3D  3F  AA  D2  E0  A3  6D
```

**Analogi:** Seperti mengaduk adonan kue — bahan-bahan dicampur berulang kali sampai tidak bisa dipisahkan.

---

## SETELAH 10 ROUND

Proses di atas diulang 10 kali, setiap kali dengan:
- Round key berbeda
- S-Box berbeda  
- Pola langkah kuda berbeda
- Jumlah rotasi berbeda

**Ciphertext akhir:** `10 F7 ... (setelah round 10)`

---

## KENAPA AMAN?

| Properti | Cara Dicapai | Angka |
|----------|-------------|-------|
| Confusion | S-Box dinamis (hubungan key↔ciphertext kompleks) | 256! kemungkinan per S-Box |
| Diffusion | ByteDiffusion + FeistelMix (1 byte ubah semua) | Avalanche ~50% |
| Key-dependent structure | S-Box, permutasi, rotasi semua berubah per kunci | - |

---

## TIPS SAAT DEMO

1. **Buka file Excel** (`excel/kcc128-walkthrough.xlsx`) — tunjukkan baris per baris
2. **Fokus di Round 1 saja** — cukup jelaskan 6 langkah sekali, lalu bilang "ini diulang 10 kali dengan parameter berbeda"
3. **Kalau ditanya "kok bisa balik?"** — Jawab: "Semua operasi punya inverse. XOR kebalikannya XOR. S-Box punya inverse S-Box. Permutasi punya inverse permutasi."
4. **Kalau ditanya "bedanya dengan AES?"** — Jawab: "AES pakai S-Box tetap dan ShiftRows linear. KCC-128 pakai S-Box yang berubah tiap round (dari chaos) dan permutasi langkah kuda (non-linear)."
5. **Tunjukkan demo web** untuk visualisasi matriks 4×4 yang berubah tiap step.

---

## QUICK REFERENCE: Operasi XOR

```
XOR = "berbeda = 1, sama = 0"

  0 XOR 0 = 0
  0 XOR 1 = 1
  1 XOR 0 = 1
  1 XOR 1 = 0

Contoh: 0x43 XOR 0x29
  0100 0011
  0010 1001
  ─────────
  0110 1010 = 0x6A

Sifat penting: A XOR B XOR B = A (bisa dibalik!)
```

---

## QUICK REFERENCE: Rotasi Bit Kiri

```
Rotasi kiri 4 dari 0x93:
  10010011  ← asli
  00111001  ← 4 bit paling kiri pindah ke kanan
  = 0x39
```

---

## ALUR LENGKAP (1 Blok)

```
"Cyber Security T"
       │
       ▼ (ubah ke byte)
[43 79 62 65 72 20 53 65 63 75 72 69 74 79 20 54]
       │
       ▼ (XOR dengan IV)
[6A 5A 5C FD 2C 1C 8C A9 BC DF 6A A8 6D 3F C2 F4]
       │
       ▼ ×10 rounds (masing-masing 6 step)
       │
       ▼
[ciphertext 16 byte]
```
