# Pseudocode Knight-Chaos Cipher (KCC-128)

**Nama:** Muhammad Rizky Hajar  
**NIM:** 24.55.2714  
**Mata Kuliah:** Cyber Security

## Parameter

- `BLOCK_SIZE = 16 byte`
- `ROUNDS = 10`
- `KEY = string bebas`
- `H(x) = SHA-256(x)`
- `LogisticMap(x) = r * x * (1 - x)`

## GenerateRoundMaterial

```text
ALGORITHM GenerateRoundMaterial(KEY)
INPUT  : KEY
OUTPUT : round material untuk setiap round

1. masterSeed <- SHA256(KEY)
2. IV <- first 16 bytes of SHA256(masterSeed || "KCC-IV")
3. FOR round FROM 0 TO 9 DO
4.     roundSeed <- SHA256(masterSeed || round)
5.     roundKey <- first 16 bytes of SHA256(roundSeed || 0)
6.     sbox <- GenerateDynamicSBox(roundSeed, round)
7.     inverseSbox <- inverse mapping of sbox
8.     permutation <- GenerateKnightPermutation(roundSeed)
9.     inversePermutation <- inverse mapping of permutation
10.    rotations[i] <- ((roundSeed[i] + i + round) MOD 7) + 1
11. END FOR
12. RETURN IV and all round materials
```

## GenerateDynamicSBox

```text
ALGORITHM GenerateDynamicSBox(roundSeed, round)
INPUT  : roundSeed, round
OUTPUT : S-Box permutasi 0..255

1. x <- normalized numeric value from roundSeed
2. r <- 3.99 - (((roundSeed[0] + round) MOD 10) / 1000)
3. FOR i FROM 0 TO 255 DO
4.     REPEAT 4 TIMES
5.         x <- r * x * (1 - x)
6.     END REPEAT
7.     score[i] <- chaotic value derived from x, roundSeed[i], and i
8. END FOR
9. Sort values 0..255 by score
10. RETURN sorted byte order as S-Box
```

## GenerateKnightPermutation

```text
ALGORITHM GenerateKnightPermutation(roundSeed)
INPUT  : roundSeed
OUTPUT : permutation of 16 byte positions

1. Treat block as 4x4 board with index 0..15
2. Select start candidates from roundSeed[0], roundSeed[1], roundSeed[2]
3. FOR each start candidate DO
4.     path <- [start]
5.     WHILE path length < 16 DO
6.         options <- all unvisited cells reachable by chess knight move
7.         Choose option with smallest onward move count
8.         Break ties using roundSeed
9.         Append chosen cell to path
10.    END WHILE
11.    IF path covers 16 cells THEN RETURN path
12. END FOR
13. RETURN seed-dependent fallback permutation
```

## EncryptBlock

```text
ALGORITHM EncryptBlock(block, roundMaterials)
INPUT  : 16-byte block
OUTPUT : 16-byte encrypted block

1. state <- block
2. FOR round FROM 1 TO 10 DO
3.     state <- state XOR roundKey[round]
4.     state <- Substitute each byte using dynamic S-Box[round]
5.     state <- Permute state using knight permutation[round]
6.     state <- Rotate each byte according to rotations[round]
7.     state <- ByteDiffusion(state, roundKey[round])
8.     state <- FeistelMix(state, roundKey[round])
9. END FOR
10. RETURN state
```

## DecryptBlock

```text
ALGORITHM DecryptBlock(block, roundMaterials)
INPUT  : 16-byte encrypted block
OUTPUT : 16-byte decrypted block

1. state <- block
2. FOR round FROM 10 DOWNTO 1 DO
3.     state <- InverseFeistelMix(state, roundKey[round])
4.     state <- InverseByteDiffusion(state, roundKey[round])
5.     state <- Rotate each byte right according to rotations[round]
6.     state <- Apply inverse knight permutation[round]
7.     state <- Substitute each byte using inverse S-Box[round]
8.     state <- state XOR roundKey[round]
9. END FOR
10. RETURN state
```

## Encrypt

```text
ALGORITHM Encrypt(plaintext, KEY)
INPUT  : plaintext, KEY
OUTPUT : ciphertext

1. Generate IV and round materials from KEY
2. padded <- Apply PKCS#7 padding to plaintext
3. previous <- IV
4. ciphertext <- empty
5. FOR each 16-byte block in padded DO
6.     chainedBlock <- block XOR previous
7.     encryptedBlock <- EncryptBlock(chainedBlock)
8.     Append encryptedBlock to ciphertext
9.     previous <- encryptedBlock
10. END FOR
11. RETURN ciphertext
```

## Decrypt

```text
ALGORITHM Decrypt(ciphertext, KEY)
INPUT  : ciphertext, KEY
OUTPUT : plaintext

1. Generate IV and round materials from KEY
2. previous <- IV
3. paddedPlaintext <- empty
4. FOR each 16-byte encryptedBlock in ciphertext DO
5.     chainedBlock <- DecryptBlock(encryptedBlock)
6.     plainBlock <- chainedBlock XOR previous
7.     Append plainBlock to paddedPlaintext
8.     previous <- encryptedBlock
9. END FOR
10. plaintext <- Remove PKCS#7 padding
11. RETURN plaintext
```
