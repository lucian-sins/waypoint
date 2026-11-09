import os
import shutil
import tarfile
import hashlib

TARGETS = [
    ("mipsel-unknown-linux-musl", "waypoint-openwrt-mipsel"),
    ("mips-unknown-linux-musl", "waypoint-openwrt-mips"),
    ("aarch64-unknown-linux-musl", "waypoint-openwrt-aarch64"),
    ("armv7-unknown-linux-musleabihf", "waypoint-openwrt-armv7"),
    ("arm-unknown-linux-musleabi", "waypoint-openwrt-armv6"),
    ("x86_64-unknown-linux-musl", "waypoint-openwrt-x86_64"),
]

dist_release = "dist_release"
os.makedirs(dist_release, exist_ok=True)

checksums = []

for rust_target, pkg_name in TARGETS:
    bin_path = os.path.join("crates", "waypoint", "target", rust_target, "release", "waypoint")
    if not os.path.isfile(bin_path):
        print(f"[-] Missing binary: {bin_path}")
        continue

    pkg_dir = os.path.join(dist_release, pkg_name)
    if os.path.exists(pkg_dir):
        shutil.rmtree(pkg_dir)
    os.makedirs(pkg_dir, exist_ok=True)

    # Copy files
    shutil.copy2(bin_path, os.path.join(pkg_dir, "waypoint"))
    shutil.copy2(os.path.join("deploy", "install.sh"), os.path.join(pkg_dir, "install.sh"))
    shutil.copy2(os.path.join("deploy", "uninstall.sh"), os.path.join(pkg_dir, "uninstall.sh"))
    shutil.copy2(os.path.join("deploy", "vpnctl"), os.path.join(pkg_dir, "vpnctl"))
    shutil.copy2(os.path.join("deploy", "waypoint.init"), os.path.join(pkg_dir, "waypoint.init"))

    tar_path = os.path.join(dist_release, f"{pkg_name}.tar.gz")
    if os.path.exists(tar_path):
        os.remove(tar_path)

    with tarfile.open(tar_path, "w:gz") as tar:
        for fname in ["waypoint", "vpnctl", "install.sh", "uninstall.sh", "waypoint.init"]:
            fpath = os.path.join(pkg_dir, fname)
            ti = tar.gettarinfo(fpath, arcname=f"{pkg_name}/{fname}")
            ti.mode = 0o755
            ti.uname = "root"
            ti.gname = "root"
            ti.uid = 0
            ti.gid = 0
            with open(fpath, "rb") as f:
                tar.addfile(ti, f)

    # Compute sha256
    with open(tar_path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    tar_size_kb = os.path.getsize(tar_path) / 1024
    print(f"[+] Packaged {pkg_name}.tar.gz ({tar_size_kb:.1f} KB) - SHA256: {digest[:16]}...")
    checksums.append(f"{digest}  {pkg_name}.tar.gz")

sha_file = os.path.join(dist_release, "SHA256SUMS.txt")
with open(sha_file, "w", encoding="utf-8") as f:
    f.write("\n".join(checksums) + "\n")

print(f"[+] Written {sha_file}")
