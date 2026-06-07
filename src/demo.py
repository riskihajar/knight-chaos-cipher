from __future__ import annotations

import argparse
import base64
from pathlib import Path

from knight_chaos_cipher import (
    KnightChaosCipher,
    avalanche_effect,
    frequency_summary,
    shannon_entropy,
)


DEFAULT_KEY = "KCC-24.55.2714-Muhammad-Rizky-Hajar"
DEFAULT_TEXT = (
    "Cyber Security Tugas 3: Knight-Chaos Cipher menggabungkan langkah kuda "
    "catur dan logistic chaotic map untuk enkripsi kreatif."
)


def run_demo(plaintext: str, key: str) -> str:
    cipher = KnightChaosCipher(key)
    plaintext_bytes = plaintext.encode("utf-8")
    ciphertext = cipher.encrypt(plaintext_bytes)
    decrypted = cipher.decrypt(ciphertext).decode("utf-8")

    lines = [
        "=== Knight-Chaos Cipher Demo ===",
        f"Nama  : Muhammad Rizky Hajar",
        f"NIM   : 24.55.2714",
        f"Key   : {key}",
        f"Plain : {plaintext}",
        "",
        f"Ciphertext (hex)   : {ciphertext.hex()}",
        f"Ciphertext (base64): {base64.b64encode(ciphertext).decode('ascii')}",
        f"Decrypted          : {decrypted}",
        f"Decryption OK      : {decrypted == plaintext}",
        "",
        "=== Security Analysis Sample ===",
        f"Plaintext entropy  : {shannon_entropy(plaintext_bytes):.4f} bit/byte",
        f"Ciphertext entropy : {shannon_entropy(ciphertext):.4f} bit/byte",
        f"Avalanche effect   : {avalanche_effect(cipher, plaintext_bytes):.2f}%",
        f"Top ciphertext byte frequencies: {frequency_summary(ciphertext)}",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Demo Knight-Chaos Cipher.")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Plaintext to encrypt.")
    parser.add_argument("--key", default=DEFAULT_KEY, help="Encryption key.")
    parser.add_argument("--sample-run", type=Path, help="Optional path to save demo output.")
    args = parser.parse_args()

    output = run_demo(args.text, args.key)
    print(output)
    if args.sample_run:
        args.sample_run.write_text(output + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
