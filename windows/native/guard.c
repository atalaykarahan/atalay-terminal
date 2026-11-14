// The released Windows app's signing guard (guard.node, beside app.asar in resources): it holds the key the app's API
// calls are signed with, among others shaped like it that are never used, and signs only inside the program it was built
// for. scripts/guard.js writes guard-build.h (the keys, masked, in a random order, and the SHA-256 of that release's
// Orbiterm.exe and app.asar) and compiles this file for every release; the source is public, the keys never are.
//
// The checks: the program it runs in is that release's Orbiterm.exe (whose fuses keep Node's inspector and
// ELECTRON_RUN_AS_NODE off) and the app.asar beside it is that release's (Electron checks it against the exe, so only the
// release's own code runs). Loaded anywhere else (a script of someone's, another Electron, a changed app) it signs
// nothing. Not a lock: whoever takes the machine code apart or injects into the running app gets past it; it turns
// "copy two strings out of app.asar" into that.
//
// N-API's functions are looked up in the host program at load (GetProcAddress on Windows), so it links against nothing
// of Node's and builds with zig alone. Built with GUARD_TEST on a Mac (CommonCrypto, dlsym), for checking it with Node.
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "guard-build.h"

#ifdef _WIN32
#include <windows.h>
#include <bcrypt.h>
#define EXPORT __declspec(dllexport)
#else
#include <dlfcn.h>
#include <stdio.h>
#include <mach-o/dyld.h>
#include <CommonCrypto/CommonDigest.h>
#include <CommonCrypto/CommonHMAC.h>
#define EXPORT __attribute__((visibility("default")))
#endif

// ---------- N-API, the few calls this uses ----------
typedef struct napi_env__ *napi_env;
typedef struct napi_value__ *napi_value;
typedef struct napi_callback_info__ *napi_callback_info;
typedef int napi_status;
typedef napi_value (*napi_callback)(napi_env, napi_callback_info);

static napi_status (*create_function)(napi_env, const char *, size_t, napi_callback, void *, napi_value *);
static napi_status (*set_named_property)(napi_env, napi_value, const char *, napi_value);
static napi_status (*get_cb_info)(napi_env, napi_callback_info, size_t *, napi_value *, napi_value *, void **);
static napi_status (*get_value_string_utf8)(napi_env, napi_value, char *, size_t, size_t *);
static napi_status (*create_string_utf8)(napi_env, const char *, size_t, napi_value *);
static napi_status (*create_object)(napi_env, napi_value *);
static napi_status (*get_null)(napi_env, napi_value *);
static napi_status (*get_boolean)(napi_env, int, napi_value *);

static void *host_symbol(const char *name) {
#ifdef _WIN32
  return (void *)GetProcAddress(GetModuleHandleW(NULL), name);
#else
  return dlsym(RTLD_DEFAULT, name);
#endif
}

static int bind_napi(void) {
  create_function = host_symbol("napi_create_function");
  set_named_property = host_symbol("napi_set_named_property");
  get_cb_info = host_symbol("napi_get_cb_info");
  get_value_string_utf8 = host_symbol("napi_get_value_string_utf8");
  create_string_utf8 = host_symbol("napi_create_string_utf8");
  create_object = host_symbol("napi_create_object");
  get_null = host_symbol("napi_get_null");
  get_boolean = host_symbol("napi_get_boolean");
  return create_function && set_named_property && get_cb_info && get_value_string_utf8 && create_string_utf8 && create_object &&
         get_null && get_boolean;
}

// ---------- SHA-256 and HMAC, the system's own ----------
static void to_hex(const unsigned char *in, size_t n, char *out) {
  static const char digits[] = "0123456789abcdef";
  for (size_t i = 0; i < n; i++) {
    out[2 * i] = digits[in[i] >> 4];
    out[2 * i + 1] = digits[in[i] & 15];
  }
  out[2 * n] = 0;
}

#ifdef _WIN32
// The file's SHA-256 (hex) in `out` (65 bytes); 0 when it can't be read.
static int file_sha256(const wchar_t *path, char *out) {
  HANDLE f = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, NULL, OPEN_EXISTING,
                         FILE_FLAG_SEQUENTIAL_SCAN, NULL);
  if (f == INVALID_HANDLE_VALUE) return 0;
  BCRYPT_ALG_HANDLE alg = NULL;
  BCRYPT_HASH_HANDLE h = NULL;
  int ok = 0;
  unsigned char *buf = malloc(1 << 20);
  if (buf && BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, NULL, 0) == 0 &&
      BCryptCreateHash(alg, &h, NULL, 0, NULL, 0, 0) == 0) {
    DWORD got = 0;
    ok = 1;
    while (ReadFile(f, buf, 1 << 20, &got, NULL) && got > 0)
      if (BCryptHashData(h, buf, got, 0) != 0) { ok = 0; break; }
    unsigned char digest[32];
    if (ok && BCryptFinishHash(h, digest, 32, 0) == 0) to_hex(digest, 32, out);
    else ok = 0;
  }
  if (h) BCryptDestroyHash(h);
  if (alg) BCryptCloseAlgorithmProvider(alg, 0);
  free(buf);
  CloseHandle(f);
  return ok;
}

static int hmac_sha256(const unsigned char *key, const char *text, size_t n, unsigned char *out) {
  BCRYPT_ALG_HANDLE alg = NULL;
  BCRYPT_HASH_HANDLE h = NULL;
  int ok = BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA256_ALGORITHM, NULL, BCRYPT_ALG_HANDLE_HMAC_FLAG) == 0 &&
           BCryptCreateHash(alg, &h, NULL, 0, (PUCHAR)key, 32, 0) == 0 &&
           BCryptHashData(h, (PUCHAR)text, (ULONG)n, 0) == 0 && BCryptFinishHash(h, out, 32, 0) == 0;
  if (h) BCryptDestroyHash(h);
  if (alg) BCryptCloseAlgorithmProvider(alg, 0);
  return ok;
}
#else
static int file_sha256(const char *path, char *out) {
  FILE *f = fopen(path, "rb");
  if (!f) return 0;
  CC_SHA256_CTX c;
  CC_SHA256_Init(&c);
  unsigned char *buf = malloc(1 << 20);
  size_t got;
  while (buf && (got = fread(buf, 1, 1 << 20, f)) > 0) CC_SHA256_Update(&c, buf, (CC_LONG)got);
  unsigned char digest[32];
  CC_SHA256_Final(digest, &c);
  fclose(f);
  if (!buf) return 0;
  free(buf);
  to_hex(digest, 32, out);
  return 1;
}

static int hmac_sha256(const unsigned char *key, const char *text, size_t n, unsigned char *out) {
  CCHmac(kCCHmacAlgSHA256, key, 32, text, n, out);
  return 1;
}
#endif

// ---------- the host ----------
// 1: this release's Orbiterm.exe with its app.asar; -1: anything else; 0: not checked yet.
static int host = 0;

static int check_host(void) {
  char hash[65];
#ifdef _WIN32
  static wchar_t exe[32768], asar[32768];
  DWORD n = GetModuleFileNameW(NULL, exe, 32768);
  if (n == 0 || n >= 32768 - 32) return -1;
  if (!file_sha256(exe, hash) || strcmp(hash, GUARD_EXE) != 0) return -1;
  wcscpy(asar, exe);
  wchar_t *slash = wcsrchr(asar, L'\\');
  if (!slash) return -1;
  wcscpy(slash + 1, L"resources\\app.asar");
  if (!file_sha256(asar, hash) || strcmp(hash, GUARD_ASAR) != 0) return -1;
#else
  char exe[4096];
  uint32_t size = sizeof exe;
  const char *asar = getenv("GUARD_TEST_ASAR");
  if (_NSGetExecutablePath(exe, &size) != 0 || !asar) return -1;
  if (!file_sha256(exe, hash) || strcmp(hash, GUARD_EXE) != 0) return -1;
  if (!file_sha256(asar, hash) || strcmp(hash, GUARD_ASAR) != 0) return -1;
#endif
  return 1;
}

static int host_ok(void) {
  if (host == 0) host = check_host();
  return host == 1;
}

// Which of the keys is the release's, read at run time so the compiler keeps every one of them.
static volatile int slot = GUARD_SLOT;

// ---------- what the app calls ----------
// ready(): whether this guard signs here.
static napi_value js_ready(napi_env env, napi_callback_info info) {
  (void)info;
  napi_value v;
  get_boolean(env, host_ok(), &v);
  return v;
}

// sign(text): { id, sig } (the key's id, hex HMAC-SHA256 of the text), or null outside the release it was built for.
static napi_value js_sign(napi_env env, napi_callback_info info) {
  size_t argc = 1, n = 0;
  napi_value argv[1], out, v;
  get_null(env, &out);
  if (get_cb_info(env, info, &argc, argv, NULL, NULL) != 0 || argc < 1 || !host_ok()) return out;
  if (get_value_string_utf8(env, argv[0], NULL, 0, &n) != 0 || n > (1 << 20)) return out;
  char *text = malloc(n + 1);
  if (!text) return out;
  if (get_value_string_utf8(env, argv[0], text, n + 1, &n) == 0) {
    int s = slot;
    unsigned char key[32], mac[32];
    for (int i = 0; i < 32; i++) key[i] = GUARD_MASK[s][i] ^ GUARD_DATA[s][i];
    int ok = hmac_sha256(key, text, n, mac);
    for (volatile unsigned char *p = key; p < key + sizeof key; p++) *p = 0;
    if (ok) {
      char hex[65];
      to_hex(mac, 32, hex);
      create_object(env, &out);
      create_string_utf8(env, GUARD_ID[s], strlen(GUARD_ID[s]), &v);
      set_named_property(env, out, "id", v);
      create_string_utf8(env, hex, 64, &v);
      set_named_property(env, out, "sig", v);
    }
  }
  free(text);
  return out;
}

// files(): what the release's pages and node-pty's files are, as scripts/guard.js found them in the finished app (JSON:
// { web: { path: sha256 }, pty: { path: sha256 } }), for main.js to check them against before they're used.
static napi_value js_files(napi_env env, napi_callback_info info) {
  (void)info;
  napi_value v;
  create_string_utf8(env, GUARD_FILES, strlen(GUARD_FILES), &v);
  return v;
}

// lock(): nothing more is signed in this process (main.js, when something could speak in the app's name).
static napi_value js_lock(napi_env env, napi_callback_info info) {
  (void)info;
  host = -1;
  napi_value v;
  get_null(env, &v);
  return v;
}

EXPORT napi_value napi_register_module_v1(napi_env env, napi_value exports) {
  if (!bind_napi()) return exports;
  napi_value fn;
  create_function(env, "ready", (size_t)-1, js_ready, NULL, &fn);
  set_named_property(env, exports, "ready", fn);
  create_function(env, "sign", (size_t)-1, js_sign, NULL, &fn);
  set_named_property(env, exports, "sign", fn);
  create_function(env, "files", (size_t)-1, js_files, NULL, &fn);
  set_named_property(env, exports, "files", fn);
  create_function(env, "lock", (size_t)-1, js_lock, NULL, &fn);
  set_named_property(env, exports, "lock", fn);
  return exports;
}

EXPORT int32_t node_api_module_get_api_version_v1(void) { return 8; }
