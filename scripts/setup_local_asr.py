"""Prepare only the pinned zlib DLL required by the existing Windows CUDA installation."""

import argparse
import hashlib
import io
import tarfile
import urllib.request
from pathlib import Path

PACKAGE_URL = "https://api.anaconda.org/download/conda-forge/libzlib-wapi/1.2.13/win-64/libzlib-wapi-1.2.13-hcfcfb64_4.tar.bz2"
PACKAGE_SHA256 = "5836b54b4489e80f355cd803b97ed335b6c3f29cf24e4aba5ae162abadc903ab"
DLL_SHA256 = "28ac18ebf49f11b83fca125f79fed4970dbca92c3a8b84eda7208ef73c35a286"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    args = parser.parse_args()
    output = args.cache_dir / "runtime" / "bin"
    dll = output / "zlibwapi.dll"
    if dll.is_file() and hashlib.sha256(dll.read_bytes()).hexdigest() == DLL_SHA256:
        print(f"Verified existing runtime DLL: {dll}")
        return
    with urllib.request.urlopen(PACKAGE_URL, timeout=30) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != PACKAGE_SHA256:
        raise ValueError("Downloaded zlib package failed SHA-256 verification")
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:bz2") as archive:
        payload = archive.extractfile("Library/bin/zlibwapi.dll").read()
        license_data = archive.extractfile("info/licenses/license.txt").read()
    if hashlib.sha256(payload).hexdigest() != DLL_SHA256:
        raise ValueError("zlib DLL failed SHA-256 verification")
    output.mkdir(parents=True, exist_ok=True)
    dll.write_bytes(payload)
    (output / "zlib-LICENSE.txt").write_bytes(license_data)
    print(f"Prepared verified runtime DLL: {dll}")


if __name__ == "__main__":
    main()
