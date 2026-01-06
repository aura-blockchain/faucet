#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "ERROR: Must be run inside a git repository." >&2
  exit 1
fi

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

forbidden_exts_regex=${FORBIDDEN_EXTS_REGEX:-'\.(exe|dll|so|dylib|a|o|bin|test|apk|ipa|aab|deb|rpm|AppImage)$'}
sensitive_exts_regex=${SENSITIVE_EXTS_REGEX:-'\.(pem|key|p12|pfx|keystore|jks|mnemonic|secret)$'}
allowlist_regex=${ALLOWLIST_REGEX:-''}
max_size_bytes=${MAX_TRACKED_FILE_SIZE_BYTES:-10485760}
skip_size_check=${SKIP_SIZE_CHECK:-0}

is_allowed() {
  local path="$1"
  if [[ -n "$allowlist_regex" && "$path" =~ $allowlist_regex ]]; then
    return 0
  fi
  return 1
}

check_tracked_forbidden() {
  local -a bad=()
  while IFS= read -r -d '' file; do
    if [[ "$file" =~ $forbidden_exts_regex ]]; then
      if is_allowed "$file"; then
        continue
      fi
      bad+=("$file")
    fi
  done < <(git ls-files -z)

  if (( ${#bad[@]} )); then
    echo "ERROR: Tracked binary/build artifacts detected:" >&2
    printf '  - %s\n' "${bad[@]}" >&2
    exit 1
  fi
}

check_tracked_sensitive() {
  local -a bad=()
  while IFS= read -r -d '' file; do
    if [[ "$file" =~ $sensitive_exts_regex ]]; then
      if is_allowed "$file"; then
        continue
      fi
      bad+=("$file")
    fi
  done < <(git ls-files -z)

  if (( ${#bad[@]} )); then
    echo "ERROR: Tracked sensitive files detected:" >&2
    printf '  - %s\n' "${bad[@]}" >&2
    exit 1
  fi
}

check_tracked_sizes() {
  if [[ "$skip_size_check" == "1" ]]; then
    return 0
  fi

  local -a bad=()
  while IFS= read -r -d '' file; do
    if is_allowed "$file"; then
      continue
    fi
    if [[ -f "$file" ]]; then
      local size
      size=$(stat -c %s "$file" 2>/dev/null || stat -f %z "$file")
      if (( size > max_size_bytes )); then
        bad+=("$file ($size bytes)")
      fi
    fi
  done < <(git ls-files -z)

  if (( ${#bad[@]} )); then
    echo "ERROR: Tracked files exceed size limit (${max_size_bytes} bytes):" >&2
    printf '  - %s\n' "${bad[@]}" >&2
    exit 1
  fi
}

check_tracked_forbidden
check_tracked_sensitive
check_tracked_sizes

echo "Repo sanity checks passed."
