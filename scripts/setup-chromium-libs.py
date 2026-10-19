#!/usr/bin/env python3
"""Install the shared libraries headless Chromium needs, WITHOUT root.

Use it when `npx playwright install-deps chromium` (needs root) is not an option.
Downloads the Debian packages into ~/.cache/chromium-libs and unpacks them there; the
E2E browser tests add that directory to LD_LIBRARY_PATH automatically.

Debian/Ubuntu only (amd64). Usage: python3 scripts/setup-chromium-libs.py
"""
import lzma
import os
import re
import subprocess
import sys
import urllib.request

MIRROR = "https://deb.debian.org/debian/"
SUITE = "bookworm"
TARGET = os.path.expanduser(os.environ.get("CHROMIUM_LIBS_DIR", "~/.cache/chromium-libs"))
WANTED = [
    "libnspr4", "libnss3", "libatk1.0-0", "libatk-bridge2.0-0", "libdbus-1-3", "libxcomposite1",
    "libxdamage1", "libxfixes3", "libxrandr2", "libgbm1", "libxkbcommon0", "libasound2", "libatspi2.0-0",
]
SKIP = {"libc6", "libgcc-s1", "libstdc++6"}


def parse_index():
    url = f"{MIRROR}dists/{SUITE}/main/binary-amd64/Packages.xz"
    with urllib.request.urlopen(url) as response:
        text = lzma.decompress(response.read()).decode("utf8")
    packages = {}
    for block in text.split("\n\n"):
        fields = dict(re.findall(r"^([A-Za-z-]+): (.*)$", block, re.M))
        if "Package" in fields:
            packages[fields["Package"]] = fields
    return packages


def installed(name):
    return subprocess.run(["dpkg", "-s", name], capture_output=True).returncode == 0


def main():
    debs, root = os.path.join(TARGET, "debs"), os.path.join(TARGET, "root")
    os.makedirs(debs, exist_ok=True)
    os.makedirs(root, exist_ok=True)
    packages, queue, seen = parse_index(), list(WANTED), set()
    while queue:
        name = queue.pop()
        if name in seen:
            continue
        seen.add(name)
        if name not in packages:
            print(f"not in the {SUITE} index: {name}", file=sys.stderr)
            continue
        if installed(name):
            continue
        filename = packages[name]["Filename"]
        deb = os.path.join(debs, os.path.basename(filename))
        if not os.path.exists(deb):
            urllib.request.urlretrieve(MIRROR + filename, deb)
        subprocess.run(["dpkg", "-x", deb, root], check=True)
        print(f"unpacked {name}")
        for dep in packages[name].get("Depends", "").split(","):
            dep_name = dep.strip().split(" ")[0].split("|")[0].strip()
            if dep_name and dep_name not in SKIP:
                queue.append(dep_name)

    lib_dirs = [os.path.join(root, "usr/lib/x86_64-linux-gnu"), os.path.join(root, "lib/x86_64-linux-gnu")]
    env_file = os.path.join(TARGET, "env.sh")
    with open(env_file, "w") as handle:
        handle.write(f"export LD_LIBRARY_PATH={':'.join(lib_dirs)}${{LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}}\n")
    print(f"Done. To use the libraries in your shell: source {env_file}")


if __name__ == "__main__":
    main()
