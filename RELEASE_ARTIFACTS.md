# Release Artifacts Policy

This repo is source/config only. Do NOT commit compiled binaries or build outputs.
Release artifacts must be published separately with checksums and signatures.

## Do not commit

- Compiled binaries or test executables
- Build outputs (build/dist/target)
- Docker image tarballs
- Secrets, keys, mnemonics, or credentials

## Release deliverables (for tagged releases)

- Built artifacts per platform
- `SHA256SUMS`
- Signature for checksums (GPG or cosign)
- Optional SBOM

## Example

```bash
sha256sum <artifact> > SHA256SUMS
gpg --armor --detach-sign SHA256SUMS
```
