# Admin API Settings

The new authenticated Admin panel manages text generation and cover-image credentials separately. Keys are encrypted on the backend and never returned to the browser. Opening or saving the panel makes no provider request. The recorded production upstream HTTP 401 remains unresolved until a valid matching provider key is supplied and the relevant operation actually succeeds; this feature does not manufacture a valid credential.

Before saving a key, follow [Encrypted Admin API Settings in the deployment guide](../deploy/DEPLOY.md#encrypted-admin-api-settings). Install `cryptography==50.0.0`, configure a stable backend-only `API_SETTINGS_ENCRYPTION_KEY`, and back it up with MongoDB. A sufficiently strong explicit, stable `JWT_SECRET` can supply the compatibility fallback when the dedicated key is absent. Never use a temporary protection key, put it in frontend settings, or replace the existing production environment with [the additive example](../backend/.env.example). Losing/changing the protection key locks saved data; deliberate rotation needs a decrypt/re-encrypt migration.

In Admin → API Settings:

1. Select the provider and model for text and images independently. Defaults preserve existing **Emergent** configuration and `EMERGENT_LLM_KEY`; adding a Google key alone does not switch providers. **Google (direct)** requires explicit selection and a Google key. An Emergent key is never sent to direct Google.
2. Enter the matching provider key and save. Saved overrides apply on each generation call without restarting. Blank password fields keep that provider's saved key. **Clear saved override** removes only the saved key; a matching environment key can still remain active. Switching provider never reuses the other provider's key.
3. Use the explicit check button after saving. Google checks key/model metadata access, without generating text or images. Emergent text sends a minimal request that may use quota. Emergent image reports readiness only, with no provider request. These distinctions appear in the result.
4. Verify an explicitly requested controlled draft and cover generation before declaring automatic publishing healthy. A saved/configured key, model lookup or readiness result does not prove generation, billing/quota access or successful publishing. Keep all existing posts and indexed page content read-only.

Missing protection produces a setup guide and prevents saving; there is no plaintext or ephemeral-key fallback. An application HTTP 401 requires renewed Admin authentication. A sanitized upstream 401 points to the selected provider's key/access; check its permissions, project, model and billing in that provider's console. Do not paste keys into chat, logs or tickets.

Local verification used fake credentials and mocked provider responses: 28 vault security/recovery checks and 15 runtime integration checks passed within the combined 203-test regression run. No real provider authentication or generation was established. See [runtime verification](provider-runtime-check.json) and the focused test sources [vault tests](../backend/tests/test_api_credentials.py) / [runtime tests](../backend/tests/test_provider_runtime_integration.py). Production deployment and a valid credential are still required.

If one provider/model configuration is invalid, Admin keeps the actual unlocked revision for repair and preserves the valid other section. This is tested using the exact full payload sent by the frontend. Locked or unreadable encrypted credentials still require restoration of the correct server protection key.
