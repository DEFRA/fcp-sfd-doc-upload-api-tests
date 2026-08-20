# fcp-sfd-doc-upload-api-tests

Automated API test suite for the FCP SFD document upload journey.

Uses Cucumber + Node fetch to drive HTTP-level tests against the object processor and CDP Uploader. No browser dependency.

## Prerequisites

- Node.js >= 22.13.1
- A `.env` file with the following variables (see `.env.example`):
  - `OBJECT_PROCESSOR_URL` -- base URL for the object processor
  - `COGNITO_TOKEN_URL`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET` -- Cognito OAuth credentials
  - `TEST_USER_SBI`, `TEST_USER_CRN`, `TEST_USER_FRN` -- real user identity in Dynamics 365 test instance
  - `TEST_S3_BUCKET` -- environment-specific S3 bucket name

## Running the tests

Install dependencies:

    npm install

Run all tests:

    npm test

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

## Reporting

Allure reports are generated after each run:

    npm run report

Report opens as a single HTML file in `allure-report/`.

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
