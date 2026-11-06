# fcp-sfd-doc-upload-api-tests

Automated API test suite for the FCP SFD document upload journey.

Uses Cucumber + Node fetch to drive HTTP-level tests against the object processor and CDP Uploader. No browser dependency.

## Prerequisites

- Node.js >= 22.22.0
- A `.env` file with the following variables (see `.env.example`):
  - `OBJECT_PROCESSOR_URL` -- base URL for the object processor
  - `COGNITO_TOKEN_URL`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET` -- Cognito OAuth credentials
  - `TEST_USER_SBI`, `TEST_USER_CRN`, `TEST_USER_FRN` -- real user identity in Dynamics 365 test instance
  - `TEST_S3_BUCKET` -- environment-specific S3 bucket name
  - Optional: `COGNITO_SCOPE`, `REQUEST_TIMEOUT_MS` (default 30000), `POLL_INTERVAL_MS` (default 500) and `POLL_TIMEOUT_MS` (default 20000)

The run stops before any scenario starts if a required variable is missing, and lists every missing one.

## Running the tests

Install dependencies:

    npm install

Run all tests:

    npm test

Check that every step in the feature files has a definition, without calling any service:

    npm run test:dry

Run the smoke scenarios (a handful covering health, auth, callback and the full journey):

    npm run test:smoke

Run scenarios in parallel (experimental):

    npm run test:parallel

The parallel run has only been checked against a local stand-in service. Scenarios share one test SBI, so confirm it is stable against a real environment before relying on it.

Run just the full journey:

    npm run test:tag "@full-journey"

Run just the CRM case checks:

    npm run test:tag "@crm"

## CRM case scenarios

The `@crm` scenarios check that a submission produces exactly one CRM case,
with every file in that submission attached to it. They guard the duplicate
case defect recorded on FLS1-156.

They read from Dataverse directly, so they need the `CRM_*` values in
`.env.example` to be set, along with `CDP_HTTP_PROXY` and egress to the
Dataverse host, since Dataverse is external. When those values are absent the
scenarios skip rather than fail, so the default run is unaffected.

Each run sets its own `QA-FLS1-156-{uuid}` upload reference. The case title is
built from that reference, which is how a run finds the case it produced and
no other. Cases created by these runs are left in place for inspection, so
clear them down periodically.

These scenarios assert the outcome only. They cannot force the timeout that
triggers the duplicate, which needs a service configuration change and queue
access this suite does not have. Reproducing the trigger is a manual step,
documented on FLS1-156.

## Test structure

- `features/upload-journey/` -- Gherkin feature files describing test scenarios
- `features/step-definitions/` -- JavaScript implementations of each step
- `features/support/` -- Cucumber world and hooks
- `fixtures/` -- test data, auth helpers, and fixture files
  - `auth.js` -- Cognito token, fetched once per run and refreshed 60 seconds before it expires
  - `api-client.js` -- `fetch` wrappers with a request timeout and the Bearer header
  - `uploader.js` -- initiate, multipart upload and status polling helpers
  - `run-id.js` -- a short id added to test data so each run's records can be told apart

Status polling fails straight away on a 4xx, retries a 5xx, and reports the last response if the upload never completes.

## Running on the CDP Platform

Run the suite from the Test Suites section of the CDP Portal. The portal runs the latest image built by the Publish workflow on `main`.

Configuration is supplied per environment:

- `cdp-app-config` (`services/fcp-sfd-doc-upload-api-tests/`) -- proxy settings in `defaults.env`, and `OBJECT_PROCESSOR_URL`, `COGNITO_TOKEN_URL`, `COGNITO_CLIENT_ID`, `TEST_USER_SBI`, `TEST_USER_CRN`, `TEST_USER_FRN` and `TEST_S3_BUCKET` in each environment file
- Portal **Secrets** tab for the test suite -- `COGNITO_CLIENT_SECRET`

The Cognito token request leaves the platform, so it goes through the outbound proxy. Node's built-in `fetch` uses the proxy when `NODE_USE_ENV_PROXY=1` is set, which requires Node.js 22.21 or later.

If any scenario fails, `entrypoint.sh` writes a `FAILED` file so the portal reports the run as failed.

## Reporting

Allure reports are generated after each run:

    npm run report

Report opens as a single HTML file in `allure-report/`.

## Pre-commit hook

A [Husky](https://typicode.github.io/husky/) pre-commit hook runs [`sfd-id-check`](https://github.com/DEFRA/fcp-sfd-core/tree/main/scripts/check-synthetic-ids), which blocks commits that add real-looking CRNs or SBIs. Pull requests run the same check.

Enable the hook once per clone:

```bash
npm install
npm run setup:husky
```

Use synthetic identifiers only: CRNs from `9000000000` to `9999999999` and SBIs from `800000000` to `899999999`. If a flagged number isn't a CRN or SBI, such as a timestamp, add `sfd-id-check: allow` in a comment on the same line, or list it in `.sfd-id-check-allow`. See the [`sfd-id-check` README](https://github.com/DEFRA/fcp-sfd-core/tree/main/scripts/check-synthetic-ids) for details.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
