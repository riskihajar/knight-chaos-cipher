"""Knight-Chaos Cipher (KCC-128).

A block cipher design that combines chess knight movement for permutation and
logistic chaotic maps for dynamic S-Box generation.
"""

from __future__ import annotations

import base64
import hashlib
import math
from collections import Counter
from dataclasses import dataclass
from typing import Iterable


BLOCK_SIZE = 16
ROUNDS = 10
BOARD_SIZE = 4


def _sha256(data: bytes) -> bytes:
    """Return SHA-256 digest bytes for deterministic key/seed derivation."""
    return hashlib.sha256(data).digest()


def _xor_bytes(left: bytes, right: bytes) -> bytes:
    """XOR two byte strings position-by-position."""
    return bytes(a ^ b for a, b in zip(left, right))


def _rotl(value: int, amount: int) -> int:
    """Rotate one byte to the left by amount bits."""
    amount %= 8
    return ((value << amount) | (value >> (8 - amount))) & 0xFF


def _rotr(value: int, amount: int) -> int:
    """Rotate one byte to the right by amount bits."""
    amount %= 8
    return ((value >> amount) | (value << (8 - amount))) & 0xFF


def pkcs7_pad(data: bytes, block_size: int = BLOCK_SIZE) -> bytes:
    """Pad data so its length becomes a multiple of the block size."""
    pad_len = block_size - (len(data) % block_size)
    return data + bytes([pad_len] * pad_len)


def pkcs7_unpad(data: bytes, block_size: int = BLOCK_SIZE) -> bytes:
    """Remove PKCS#7 padding and validate that the padding bytes are correct."""
    if not data or len(data) % block_size != 0:
        raise ValueError("Invalid padded data length.")
    pad_len = data[-1]
    if pad_len < 1 or pad_len > block_size:
        raise ValueError("Invalid PKCS#7 padding value.")
    if data[-pad_len:] != bytes([pad_len] * pad_len):
        raise ValueError("Invalid PKCS#7 padding bytes.")
    return data[:-pad_len]


@dataclass(frozen=True)
class RoundMaterial:
    """All values needed by one encryption/decryption round."""

    key: bytes
    sbox: tuple[int, ...]
    inverse_sbox: tuple[int, ...]
    permutation: tuple[int, ...]
    inverse_permutation: tuple[int, ...]
    rotations: tuple[int, ...]


class KnightChaosCipher:
    """Encrypts and decrypts bytes with the KCC-128 algorithm."""

    def __init__(self, key: str | bytes, rounds: int = ROUNDS) -> None:
        """Build cipher instance and derive IV plus all round materials."""
        if isinstance(key, str):
            key_bytes = key.encode("utf-8")
        else:
            key_bytes = key
        if not key_bytes:
            raise ValueError("Key must not be empty.")
        self.key_bytes = key_bytes
        self.master_seed = _sha256(key_bytes)
        self.rounds = rounds
        self.iv = _sha256(self.master_seed + b"KCC-IV")[:BLOCK_SIZE]
        self.round_material = tuple(
            self._build_round_material(round_index)
            for round_index in range(rounds)
        )

    def encrypt(self, plaintext: bytes) -> bytes:
        """Encrypt arbitrary-length plaintext using padding and CBC-style chaining."""
        padded = pkcs7_pad(plaintext)
        previous = self.iv
        output = bytearray()
        for i in range(0, len(padded), BLOCK_SIZE):
            chained = _xor_bytes(padded[i:i + BLOCK_SIZE], previous)
            encrypted = self.encrypt_block(chained)
            output.extend(encrypted)
            previous = encrypted
        return bytes(output)

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Decrypt ciphertext, reverse CBC-style chaining, and remove padding."""
        if len(ciphertext) % BLOCK_SIZE != 0:
            raise ValueError("Ciphertext length must be a multiple of 16 bytes.")
        previous = self.iv
        output = bytearray()
        for i in range(0, len(ciphertext), BLOCK_SIZE):
            block = ciphertext[i:i + BLOCK_SIZE]
            decrypted = self.decrypt_block(block)
            output.extend(_xor_bytes(decrypted, previous))
            previous = block
        padded = bytes(output)
        return pkcs7_unpad(padded)

    def encrypt_text(self, plaintext: str) -> str:
        """Encrypt UTF-8 text and return ciphertext as Base64 text."""
        ciphertext = self.encrypt(plaintext.encode("utf-8"))
        return base64.b64encode(ciphertext).decode("ascii")

    def decrypt_text(self, ciphertext_b64: str) -> str:
        """Decode Base64 ciphertext, decrypt it, and return UTF-8 plaintext."""
        ciphertext = base64.b64decode(ciphertext_b64)
        return self.decrypt(ciphertext).decode("utf-8")

    def encrypt_block(self, block: bytes) -> bytes:
        """Encrypt one 16-byte block through all substitution/permutation rounds."""
        if len(block) != BLOCK_SIZE:
            raise ValueError("Block must be exactly 16 bytes.")
        state = block
        for material in self.round_material:
            state = _xor_bytes(state, material.key)
            state = bytes(material.sbox[b] for b in state)
            state = self._permute(state, material.permutation)
            state = bytes(_rotl(b, material.rotations[i]) for i, b in enumerate(state))
            state = self._diffuse(state, material.key)
            state = self._feistel_mix(state, material.key)
        return state

    def decrypt_block(self, block: bytes) -> bytes:
        """Decrypt one 16-byte block by applying every round inverse in reverse."""
        if len(block) != BLOCK_SIZE:
            raise ValueError("Block must be exactly 16 bytes.")
        state = block
        for material in reversed(self.round_material):
            state = self._inverse_feistel_mix(state, material.key)
            state = self._undiffuse(state, material.key)
            state = bytes(_rotr(b, material.rotations[i]) for i, b in enumerate(state))
            state = self._permute(state, material.inverse_permutation)
            state = bytes(material.inverse_sbox[b] for b in state)
            state = _xor_bytes(state, material.key)
        return state

    def trace_block(self, block: bytes) -> list[dict[str, str | int]]:
        """Return round-by-round states for walkthrough or explanation."""
        if len(block) != BLOCK_SIZE:
            raise ValueError("Trace block must be exactly 16 bytes.")
        trace: list[dict[str, str | int]] = [{"round": 0, "step": "Initial", "hex": block.hex()}]
        state = block
        for round_number, material in enumerate(self.round_material, start=1):
            state = _xor_bytes(state, material.key)
            trace.append({"round": round_number, "step": "AddRoundKey", "hex": state.hex()})
            state = bytes(material.sbox[b] for b in state)
            trace.append({"round": round_number, "step": "ChaoticSubBytes", "hex": state.hex()})
            state = self._permute(state, material.permutation)
            trace.append({"round": round_number, "step": "KnightPermutation", "hex": state.hex()})
            state = bytes(_rotl(b, material.rotations[i]) for i, b in enumerate(state))
            trace.append({"round": round_number, "step": "BitShiftMix", "hex": state.hex()})
            state = self._diffuse(state, material.key)
            trace.append({"round": round_number, "step": "ByteDiffusion", "hex": state.hex()})
            state = self._feistel_mix(state, material.key)
            trace.append({"round": round_number, "step": "FeistelMix", "hex": state.hex()})
        return trace

    def _build_round_material(self, round_index: int) -> RoundMaterial:
        """Derive the round key, S-Box, permutation, and rotations for one round."""
        round_seed = _sha256(self.master_seed + round_index.to_bytes(2, "big"))
        key = self._expand_round_key(round_seed)
        sbox = self._generate_sbox(round_seed, round_index)
        inverse_sbox = self._inverse_tuple(sbox)
        permutation = self._generate_knight_permutation(round_seed)
        inverse_permutation = self._inverse_tuple(permutation)
        rotations = tuple(((round_seed[i % len(round_seed)] + i + round_index) % 7) + 1 for i in range(BLOCK_SIZE))
        return RoundMaterial(key, sbox, inverse_sbox, permutation, inverse_permutation, rotations)

    def _expand_round_key(self, seed: bytes) -> bytes:
        """Expand a round seed into exactly 16 bytes of round key material."""
        expanded = bytearray()
        counter = 0
        while len(expanded) < BLOCK_SIZE:
            expanded.extend(_sha256(seed + counter.to_bytes(2, "big")))
            counter += 1
        return bytes(expanded[:BLOCK_SIZE])

    def _generate_sbox(self, seed: bytes, round_index: int) -> tuple[int, ...]:
        """Generate a dynamic bijective S-Box using a logistic chaotic map."""
        seed_int = int.from_bytes(seed, "big")
        x = ((seed_int % 900000) + 9999) / 1000000.0
        r = 3.99 - ((seed[0] + round_index) % 10) / 1000.0
        values = []
        for i in range(256):
            for _ in range(4):
                x = r * x * (1.0 - x)
            score = int((x * 10**12) % (1 << 32)) ^ (seed[i % len(seed)] << 8) ^ i
            values.append((score, i))
        return tuple(item for _, item in sorted(values))

    def _generate_knight_permutation(self, seed: bytes) -> tuple[int, ...]:
        """Generate a bijective permutation where every mapping is a knight move."""
        output_order = sorted(
            range(BLOCK_SIZE),
            key=lambda i: seed[(i * 3) % len(seed)] ^ (i * 29),
        )
        choices = {
            output_index: sorted(
                self._knight_targets(output_index),
                key=lambda source_index: (
                    seed[(output_index + source_index) % len(seed)] ^ (source_index * 17),
                    source_index,
                ),
            )
            for output_index in range(BLOCK_SIZE)
        }
        assigned: dict[int, int] = {}
        used_sources: set[int] = set()

        def backtrack() -> bool:
            if len(assigned) == BLOCK_SIZE:
                return True
            remaining = [index for index in output_order if index not in assigned]
            output_index = min(
                remaining,
                key=lambda index: (
                    sum(source not in used_sources for source in choices[index]),
                    output_order.index(index),
                ),
            )
            for source_index in choices[output_index]:
                if source_index in used_sources:
                    continue
                assigned[output_index] = source_index
                used_sources.add(source_index)
                if backtrack():
                    return True
                used_sources.remove(source_index)
                del assigned[output_index]
            return False

        if not backtrack():
            raise ValueError("Cannot build knight-move permutation on 4x4 board.")
        return tuple(assigned[index] for index in range(BLOCK_SIZE))

    def _knight_targets(self, index: int) -> list[int]:
        """Return board indexes reachable by one legal L-shaped knight move."""
        moves = [(2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1)]
        row, col = divmod(index, BOARD_SIZE)
        targets = []
        for dr, dc in moves:
            nr, nc = row + dr, col + dc
            if 0 <= nr < BOARD_SIZE and 0 <= nc < BOARD_SIZE:
                targets.append(nr * BOARD_SIZE + nc)
        return targets

    def _knight_path(self, start: int, seed: bytes) -> list[int]:
        """Build a path over the 4x4 board using legal chess knight moves."""
        moves = [(2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1)]
        path = [start]
        visited = {start}
        for depth in range(BLOCK_SIZE - 1):
            row, col = divmod(path[-1], BOARD_SIZE)
            options = []
            for dr, dc in moves:
                nr, nc = row + dr, col + dc
                if 0 <= nr < BOARD_SIZE and 0 <= nc < BOARD_SIZE:
                    index = nr * BOARD_SIZE + nc
                    if index not in visited:
                        onward = self._onward_count(index, visited | {index})
                        tie = seed[(depth + index) % len(seed)] ^ (index * 17)
                        options.append((onward, tie, index))
            if not options:
                return []
            _, _, chosen = min(options)
            path.append(chosen)
            visited.add(chosen)
        return path

    def _onward_count(self, index: int, visited: set[int]) -> int:
        """Count available next knight moves from one board index."""
        moves = [(2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1)]
        row, col = divmod(index, BOARD_SIZE)
        count = 0
        for dr, dc in moves:
            nr, nc = row + dr, col + dc
            next_index = nr * BOARD_SIZE + nc
            if 0 <= nr < BOARD_SIZE and 0 <= nc < BOARD_SIZE and next_index not in visited:
                count += 1
        return count

    @staticmethod
    def _permute(state: bytes, permutation: Iterable[int]) -> bytes:
        """Reorder state bytes according to an output-index to source-index map."""
        source = list(state)
        output = [0] * BLOCK_SIZE
        for output_index, source_index in enumerate(permutation):
            output[output_index] = source[source_index]
        return bytes(output)

    @staticmethod
    def _diffuse(state: bytes, round_key: bytes) -> bytes:
        """Apply forward byte diffusion so earlier bytes influence later bytes."""
        output = [0] * BLOCK_SIZE
        carry = round_key[0]
        for i, value in enumerate(state):
            neighbor = output[i - 1] if i > 0 else round_key[-1]
            output[i] = value ^ carry ^ neighbor ^ ((round_key[i] + i * 13) & 0xFF)
            carry = output[i]
        return bytes(output)

    @staticmethod
    def _undiffuse(state: bytes, round_key: bytes) -> bytes:
        """Reverse the byte diffusion step during decryption."""
        output = [0] * BLOCK_SIZE
        carry = round_key[0]
        for i, value in enumerate(state):
            neighbor = state[i - 1] if i > 0 else round_key[-1]
            output[i] = value ^ carry ^ neighbor ^ ((round_key[i] + i * 13) & 0xFF)
            carry = value
        return bytes(output)

    @staticmethod
    def _feistel_mix(state: bytes, round_key: bytes) -> bytes:
        """Apply invertible 3-pass byte mixing to strengthen diffusion."""
        mixed = list(state)
        for pass_index in range(3):
            for i in range(BLOCK_SIZE):
                j = (i + 1) % BLOCK_SIZE
                rotation = ((round_key[(i + pass_index) % BLOCK_SIZE] + pass_index) % 7) + 1
                mixed[j] ^= _rotl((mixed[i] + round_key[i]) & 0xFF, rotation)
        return bytes(mixed)

    @staticmethod
    def _inverse_feistel_mix(state: bytes, round_key: bytes) -> bytes:
        """Reverse the Feistel-like byte mixing step."""
        mixed = list(state)
        for pass_index in range(2, -1, -1):
            for i in range(BLOCK_SIZE - 1, -1, -1):
                j = (i + 1) % BLOCK_SIZE
                rotation = ((round_key[(i + pass_index) % BLOCK_SIZE] + pass_index) % 7) + 1
                mixed[j] ^= _rotl((mixed[i] + round_key[i]) & 0xFF, rotation)
        return bytes(mixed)

    @staticmethod
    def _inverse_tuple(values: tuple[int, ...]) -> tuple[int, ...]:
        """Create inverse mapping for an S-Box or permutation tuple."""
        inverse = [0] * len(values)
        for i, value in enumerate(values):
            inverse[value] = i
        return tuple(inverse)


def shannon_entropy(data: bytes) -> float:
    """Calculate Shannon entropy in bits per byte for analysis output."""
    if not data:
        return 0.0
    counter = Counter(data)
    length = len(data)
    return -sum((count / length) * math.log2(count / length) for count in counter.values())


def bit_difference(left: bytes, right: bytes) -> int:
    """Count bit positions that differ between two byte strings."""
    return sum((a ^ b).bit_count() for a, b in zip(left, right))


def avalanche_effect(cipher: KnightChaosCipher, plaintext: bytes) -> float:
    """Measure ciphertext bit-change percentage after flipping one plaintext bit."""
    if not plaintext:
        plaintext = b"\x00"
    modified = bytearray(plaintext)
    modified[0] ^= 0x01
    left = cipher.encrypt(plaintext)
    right = cipher.encrypt(bytes(modified))
    total_bits = min(len(left), len(right)) * 8
    return (bit_difference(left, right) / total_bits) * 100.0


def frequency_summary(data: bytes, limit: int = 10) -> list[tuple[str, int]]:
    """Return the most frequent byte values as compact hex/count pairs."""
    counter = Counter(data)
    return [(f"0x{byte:02x}", count) for byte, count in counter.most_common(limit)]
