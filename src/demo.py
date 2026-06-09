from __future__ import annotations

import argparse
import base64
import sys
from dataclasses import dataclass
from pathlib import Path

from knight_chaos_cipher import (
    BLOCK_SIZE,
    KnightChaosCipher,
    avalanche_effect,
    frequency_summary,
    pkcs7_pad,
    shannon_entropy,
)


DEFAULT_KEY = "KCC-24.55.2714-Muhammad-Rizky-Hajar"
DEFAULT_TEXT = (
    "Cyber Security Tugas 3: Knight-Chaos Cipher menggabungkan langkah kuda "
    "catur dan logistic chaotic map untuk enkripsi kreatif."
)

STEP_INFO = {
    "Initial": (
        "Plaintext block",
        "Blok 16 byte ditampilkan sebagai matriks 4x4 sebelum masuk round.",
    ),
    "CBC-XOR-IV": (
        "CBC chaining",
        "Plaintext block di-XOR dengan IV atau ciphertext blok sebelumnya.",
    ),
    "AddRoundKey": (
        "AddRoundKey",
        "Setiap byte state di-XOR dengan round key.",
    ),
    "ChaoticSubBytes": (
        "Chaotic S-Box",
        "Setiap byte diganti memakai S-Box dinamis dari logistic chaotic map.",
    ),
    "KnightPermutation": (
        "Knight permutation",
        "Posisi byte disusun ulang mengikuti jalur langkah kuda pada papan 4x4.",
    ),
    "BitShiftMix": (
        "Bit rotation",
        "Setiap byte diputar bit-nya sesuai nilai rotasi dari key schedule.",
    ),
    "ByteDiffusion": (
        "Byte diffusion",
        "Byte saat ini dicampur dengan carry, tetangga, dan round key.",
    ),
    "FeistelMix": (
        "Feistel mix",
        "State dicampur lagi dengan operasi invertible agar perubahan menyebar.",
    ),
}


@dataclass
class DemoState:
    """Store all values needed by the interactive terminal walkthrough."""

    plaintext: str
    key: str
    cipher: KnightChaosCipher
    plaintext_bytes: bytes
    padded: bytes
    ciphertext: bytes
    decrypted: str
    block_inputs: list[bytes]
    block_traces: list[list[dict[str, str | int]]]
    block_ciphertexts: list[bytes]


def xor_bytes(left: bytes, right: bytes) -> bytes:
    """XOR two byte strings using the shortest shared length."""
    return bytes(a ^ b for a, b in zip(left, right))


def short_hex(data: bytes | str, limit: int = 48) -> str:
    """Return compact hex text that stays readable in terminal panels."""
    text = data if isinstance(data, str) else data.hex()
    return text if len(text) <= limit else f"{text[:limit]}..."


def printable_block(data: bytes) -> str:
    """Convert one byte block into printable ASCII preview text."""
    return "".join(chr(byte) if 32 <= byte < 127 else "." for byte in data)


def format_panel(title: str, body: list[str]) -> str:
    """Render a simple square terminal panel with a title and body lines."""
    width = 78
    content_width = width - 4
    border = "+" + "-" * (width - 2) + "+"
    title_line = f"| {title.upper():<{content_width}} |"
    lines = [border, title_line, border]
    for item in body:
        for line in item.splitlines() or [""]:
            while len(line) > content_width:
                split_at = line.rfind(" ", 0, content_width + 1)
                if split_at <= 0:
                    split_at = content_width
                lines.append(f"| {line[:split_at]:<{content_width}} |")
                line = line[split_at:].lstrip()
            lines.append(f"| {line:<{content_width}} |")
    lines.append(border)
    return "\n".join(lines)


def format_matrix(block: bytes) -> str:
    """Render 16 bytes as a 4x4 matrix similar to the web demo state view."""
    rows = []
    for row in range(4):
        values = [f"{block[row * 4 + col]:02X}" for col in range(4)]
        rows.append("  " + "  ".join(values))
    return "\n".join(rows)


def format_knight_board(permutation: tuple[int, ...]) -> str:
    """Render source indexes selected by each 4x4 output position."""
    rows = []
    for row in range(4):
        values = []
        for col in range(4):
            output_index = row * 4 + col
            values.append(f"S{permutation[output_index]:02d}")
        rows.append("  " + "  ".join(values))
    return "\n".join(rows)


def knight_move_cells(from_index: int, to_index: int) -> dict[int, str]:
    """Return FROM/LEG/TURN/TO cells that draw one L-shaped knight move."""
    from_row, from_col = divmod(from_index, 4)
    to_row, to_col = divmod(to_index, 4)
    row_delta = to_row - from_row
    col_delta = to_col - from_col
    row_step = 1 if row_delta > 0 else -1 if row_delta < 0 else 0
    col_step = 1 if col_delta > 0 else -1 if col_delta < 0 else 0
    cells = {from_index: "FROM", to_index: "TO"}

    if abs(row_delta) == 2 and abs(col_delta) == 1:
        cells[(from_row + row_step) * 4 + from_col] = "LEG"
        cells[to_row * 4 + from_col] = "TURN"
    elif abs(row_delta) == 1 and abs(col_delta) == 2:
        cells[from_row * 4 + from_col + col_step] = "LEG"
        cells[from_row * 4 + to_col] = "TURN"
    return cells


def format_knight_l_move(permutation: tuple[int, ...], output_index: int = 0) -> str:
    """Render the active L shape from one output position to its source position."""
    output_index = max(0, min(output_index, len(permutation) - 1))
    source_index = permutation[output_index]
    cells = knight_move_cells(output_index, source_index)
    rows = [f"  Bentuk L aktif: output {output_index:02d} mengambil source {source_index:02d}"]
    for row in range(4):
        values = []
        for col in range(4):
            cell_index = row * 4 + col
            label = cells.get(cell_index, "..")
            if label == "FROM":
                label = "OUT"
            elif label == "TO":
                label = "SRC"
            values.append(f"{label:<4}")
        rows.append("  " + " ".join(values))
    return "\n".join(rows)


def render_knight_path(state: DemoState, round_number: int, move_index: int = 0) -> str:
    """Render the chess-knight path used by one round permutation."""
    material = state.cipher.round_material[round_number - 1]
    route = " -> ".join(
        f"out{output_index:02d}<-src{source_index:02d}"
        for output_index, source_index in enumerate(material.permutation)
    )
    return "\n".join(
        [
            f"Knight path round {round_number}:",
            "  Format papan: Sxx berarti output cell mengambil source xx",
            format_knight_board(material.permutation),
            format_knight_l_move(material.permutation, move_index),
            f"  Route: {route}",
        ]
    )


def build_state(plaintext: str, key: str) -> DemoState:
    """Encrypt text and build CBC block traces for interactive inspection."""
    cipher = KnightChaosCipher(key)
    plaintext_bytes = plaintext.encode("utf-8")
    padded = pkcs7_pad(plaintext_bytes)
    ciphertext = cipher.encrypt(plaintext_bytes)
    decrypted = cipher.decrypt(ciphertext).decode("utf-8")

    previous = cipher.iv
    block_inputs: list[bytes] = []
    block_traces: list[list[dict[str, str | int]]] = []
    block_ciphertexts: list[bytes] = []
    for offset in range(0, len(padded), BLOCK_SIZE):
        plain_block = padded[offset:offset + BLOCK_SIZE]
        chained = xor_bytes(plain_block, previous)
        trace = [
            {"round": 0, "step": "Initial", "hex": plain_block.hex()},
            {"round": 0, "step": "CBC-XOR-IV", "hex": chained.hex()},
            *cipher.trace_block(chained)[1:],
        ]
        encrypted = bytes.fromhex(str(trace[-1]["hex"]))
        block_inputs.append(plain_block)
        block_traces.append(trace)
        block_ciphertexts.append(encrypted)
        previous = encrypted

    return DemoState(
        plaintext=plaintext,
        key=key,
        cipher=cipher,
        plaintext_bytes=plaintext_bytes,
        padded=padded,
        ciphertext=ciphertext,
        decrypted=decrypted,
        block_inputs=block_inputs,
        block_traces=block_traces,
        block_ciphertexts=block_ciphertexts,
    )


def render_header(state: DemoState) -> str:
    """Render identity, algorithm settings, plaintext, and ciphertext summary."""
    return format_panel(
        "KCC-128 Terminal",
        [
            "Tugas 3 Cyber Security",
            "Knight-Chaos Cipher",
            "Muhammad Rizky Hajar - 24.55.2714",
            "",
            "Algoritma : KCC-128 (Block Cipher 128-bit)",
            "Blok      : 16 byte (4x4 matrix)",
            "Round     : 10",
            "S-Box     : Logistic Chaotic Map dinamis per round",
            "Permutasi : Knight L-move matching pada board 4x4",
            "Mode      : CBC (Cipher Block Chaining)",
            "Padding   : PKCS#7",
            "",
            f"Plaintext : {state.plaintext}",
            f"Key       : {state.key}",
            f"Cipherhex : {state.ciphertext.hex()}",
            f"Base64    : {base64.b64encode(state.ciphertext).decode('ascii')}",
            f"Decrypt   : {'OK - plaintext kembali utuh' if state.decrypted == state.plaintext else 'Gagal'}",
        ],
    )


def render_security_analysis(state: DemoState) -> str:
    """Render entropy, avalanche effect, and frequency output for ciphertext."""
    frequencies = "  ".join(
        f"{byte}:{count}" for byte, count in frequency_summary(state.ciphertext)
    )
    return format_panel(
        "Security Analysis",
        [
            f"Plaintext entropy  : {shannon_entropy(state.plaintext_bytes):.4f} bit/byte",
            "  Keragaman byte sebelum enkripsi.",
            f"Ciphertext entropy : {shannon_entropy(state.ciphertext):.4f} bit/byte",
            "  Keragaman byte setelah enkripsi.",
            f"Avalanche effect   : {avalanche_effect(state.cipher, state.plaintext_bytes):.2f}%",
            "  Perubahan ciphertext saat 1 bit plaintext diubah.",
            f"Top byte frequency : {frequencies}",
        ],
    )


def render_timeline(trace: list[dict[str, str | int]], step_index: int) -> str:
    """Render compact timeline labels and mark the current step."""
    labels = []
    for index, item in enumerate(trace):
        marker = ">" if index == step_index else " "
        labels.append(f"{marker}{index:02d}:{item['step']}")
    rows = []
    for offset in range(0, len(labels), 2):
        rows.append(" | ".join(f"{label:<34}" for label in labels[offset:offset + 2]))
    return "\n".join(rows)


def render_step(state: DemoState, block_index: int, step_index: int) -> str:
    """Render one selected block and selected animation step."""
    trace = state.block_traces[block_index]
    item = trace[step_index]
    current = bytes.fromhex(str(item["hex"]))
    previous = bytes.fromhex(str(trace[step_index - 1]["hex"])) if step_index else b""
    step_name = str(item["step"])
    title, explanation = STEP_INFO.get(step_name, (step_name, "State berubah pada tahap ini."))

    body = [
        f"Blok {block_index + 1}/{len(state.block_traces)} - Step {step_index}/{len(trace) - 1}",
        f"Round : {item['round']}",
        f"Operasi : {title}",
        f"Makna   : {explanation}",
        "",
        "Plain block preview:",
        f"  {printable_block(state.block_inputs[block_index])}",
        "",
        "State matrix 4x4:",
        format_matrix(current),
        "",
        f"Before : {short_hex(previous) if previous else '-'}",
        f"After  : {short_hex(current)}",
        "",
        "Timeline:",
        render_timeline(trace, step_index),
    ]
    if int(item["round"]) > 0:
        body.extend(["", render_knight_path(state, int(item["round"]), 0)])
    return format_panel("Step-by-step Animation", body)


def render_assembly(state: DemoState) -> str:
    """Render ciphertext block assembly like the web concat panel."""
    body = []
    for index, block in enumerate(state.block_ciphertexts, start=1):
        body.append(f"Blok {index:<2}: {block.hex()}")
    body.extend(["", f"Ciphertext final: {state.ciphertext.hex()}"])
    return format_panel("Assembly / Concat Blok -> Ciphertext", body)


def prompt_with_default(label: str, default: str) -> str:
    """Ask for terminal input and return the default when the user presses Enter."""
    value = input(f"{label} [{default}]: ").strip()
    return value or default


def decrypt_custom_hex(state: DemoState) -> str:
    """Prompt for ciphertext hex and try to decrypt it with the active key."""
    raw = input("Ciphertext hex: ").strip()
    try:
        ciphertext = bytes.fromhex("".join(raw.split()))
        plaintext = state.cipher.decrypt(ciphertext).decode("utf-8")
    except Exception as exc:
        return format_panel("Decrypt / Uji Ciphertext", [f"Gagal: {exc}"])
    return format_panel("Decrypt / Uji Ciphertext", [f"OK -> {plaintext}"])


def print_interactive_help() -> None:
    """Print command list for the interactive CLI."""
    print(
        format_panel(
            "Command",
            [
                "n / next       : maju satu step",
                "p / prev       : mundur satu step",
                "b <nomor>      : pindah blok, contoh b 2",
                "j <nomor>      : lompat ke step, contoh j 10",
                "a / analysis   : tampilkan Security Analysis",
                "k / knight     : tampilkan jalur kuda round aktif",
                "s / summary    : tampilkan ringkasan enkripsi",
                "c / concat     : tampilkan assembly ciphertext",
                "d / decrypt    : uji decrypt ciphertext hex",
                "r / rerun      : ganti plaintext dan key",
                "q / quit       : keluar",
            ],
        )
    )


def interactive_loop() -> None:
    """Run the terminal walkthrough with editable plaintext/key and navigation."""
    print("KCC-128 TERMINAL")
    print("Tekan Enter untuk memakai nilai default.\n")
    plaintext = prompt_with_default("Plaintext", DEFAULT_TEXT)
    key = prompt_with_default("Key", DEFAULT_KEY)
    state = build_state(plaintext, key)
    block_index = 0
    step_index = 0

    print(render_header(state))
    print(render_step(state, block_index, step_index))
    print_interactive_help()

    while True:
        command = input("kcc> ").strip().lower()
        if command in {"q", "quit", "exit"}:
            print("Selesai.")
            return
        if command in {"h", "help", "?"}:
            print_interactive_help()
            continue
        if command in {"n", "next", ""}:
            step_index = min(step_index + 1, len(state.block_traces[block_index]) - 1)
            print(render_step(state, block_index, step_index))
            continue
        if command in {"p", "prev"}:
            step_index = max(step_index - 1, 0)
            print(render_step(state, block_index, step_index))
            continue
        if command.startswith("b "):
            try:
                block_index = max(0, min(int(command.split()[1]) - 1, len(state.block_traces) - 1))
                step_index = 0
                print(render_step(state, block_index, step_index))
            except (IndexError, ValueError):
                print("Format blok: b 1")
            continue
        if command.startswith("j "):
            try:
                step_index = max(0, min(int(command.split()[1]), len(state.block_traces[block_index]) - 1))
                print(render_step(state, block_index, step_index))
            except (IndexError, ValueError):
                print("Format step: j 10")
            continue
        if command in {"a", "analysis"}:
            print(render_security_analysis(state))
            continue
        if command in {"k", "knight"}:
            active_round = int(state.block_traces[block_index][step_index]["round"]) or 1
            print(format_panel("Knight Path", [render_knight_path(state, active_round, 0)]))
            continue
        if command in {"s", "summary"}:
            print(render_header(state))
            continue
        if command in {"c", "concat", "assembly"}:
            print(render_assembly(state))
            continue
        if command in {"d", "decrypt"}:
            print(decrypt_custom_hex(state))
            continue
        if command in {"r", "rerun"}:
            plaintext = prompt_with_default("Plaintext", state.plaintext)
            key = prompt_with_default("Key", state.key)
            state = build_state(plaintext, key)
            block_index = 0
            step_index = 0
            print(render_header(state))
            print(render_step(state, block_index, step_index))
            continue
        print("Command tidak dikenal. Ketik h untuk bantuan.")


def run_demo(plaintext: str, key: str) -> str:
    """Run one complete encryption/decryption demo and format analysis output."""
    state = build_state(plaintext, key)
    return "\n\n".join(
        [
            render_header(state),
            render_step(state, 0, 0),
            render_step(state, 0, 4),
            render_assembly(state),
            render_security_analysis(state),
        ]
    )


def main() -> None:
    """Parse CLI arguments and choose automatic or interactive terminal mode."""
    parser = argparse.ArgumentParser(description="Demo Knight-Chaos Cipher.")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Plaintext to encrypt.")
    parser.add_argument("--key", default=DEFAULT_KEY, help="Encryption key.")
    parser.add_argument("--sample-run", type=Path, help="Optional path to save demo output.")
    parser.add_argument("--interactive", action="store_true", help="Open interactive CLI walkthrough.")
    args = parser.parse_args()

    if args.interactive or (len(sys.argv) == 1 and sys.stdin.isatty()):
        interactive_loop()
        return

    output = run_demo(args.text, args.key)
    print(output)
    if args.sample_run:
        args.sample_run.write_text(output + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
