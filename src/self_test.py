from __future__ import annotations

from knight_chaos_cipher import KnightChaosCipher, avalanche_effect, shannon_entropy


CASES = [
    ("", "key-1"),
    ("A", "key-1"),
    ("Teks panjang dengan angka 12345 dan simbol !@#$%", "key-2"),
    ("Knight-Chaos Cipher harus dapat mengembalikan plaintext.", "key-3"),
]


def main() -> None:
    """Run small correctness tests for empty, short, and longer plaintext cases."""
    for index, (text, key) in enumerate(CASES, start=1):
        cipher = KnightChaosCipher(key)
        ciphertext = cipher.encrypt(text.encode("utf-8"))
        decrypted = cipher.decrypt(ciphertext).decode("utf-8")
        assert decrypted == text, f"case {index} failed"
        print(
            f"case {index}: ok | ciphertext={len(ciphertext)} bytes | "
            f"entropy={shannon_entropy(ciphertext):.4f} | "
            f"avalanche={avalanche_effect(cipher, text.encode('utf-8')):.2f}%"
        )


if __name__ == "__main__":
    main()
